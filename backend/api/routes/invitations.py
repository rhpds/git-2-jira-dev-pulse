"""Team invitation links API routes."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, Organization, OrganizationMember, InvitationLink
from ..services.auth_service import get_user_organization, get_org_subscription
from ..middleware.auth_middleware import get_current_user, require_org_role

router = APIRouter(prefix="/api/org/invitations", tags=["invitations"])


class CreateInviteLinkRequest(BaseModel):
    role: str = Field("member")  # viewer, member, admin
    max_uses: int | None = None  # null = unlimited
    expires_in_hours: int = Field(72, ge=1, le=720)  # Default 3 days, max 30 days


@router.get("/")
async def list_invite_links(
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """List all invitation links for the organization."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"links": []}

    org, _role = org_info
    stmt = (
        select(InvitationLink)
        .where(InvitationLink.org_id == org.id)
        .order_by(InvitationLink.created_at.desc())
    )
    links = list(db.execute(stmt).scalars().all())

    now = datetime.now(timezone.utc)
    return {
        "links": [
            {
                "id": link.id,
                "token": link.token,
                "role": link.role,
                "max_uses": link.max_uses,
                "use_count": link.use_count,
                "is_active": link.is_active,
                "is_expired": link.expires_at is not None and link.expires_at < now,
                "expires_at": link.expires_at.isoformat() if link.expires_at else None,
                "created_at": link.created_at.isoformat() if link.created_at else None,
            }
            for link in links
        ],
    }


@router.post("/")
async def create_invite_link(
    request: CreateInviteLinkRequest,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a shareable invitation link."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info

    valid_roles = ["viewer", "member", "admin"]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=request.expires_in_hours)

    link = InvitationLink(
        org_id=org.id,
        token=token,
        role=request.role,
        max_uses=request.max_uses,
        expires_at=expires_at,
        created_by=user.id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return {
        "id": link.id,
        "token": link.token,
        "role": link.role,
        "max_uses": link.max_uses,
        "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        "invite_url": f"/join/{link.token}",
    }


@router.post("/{token}/accept")
async def accept_invite_link(
    token: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept an invitation link and join the organization."""
    link = db.execute(
        select(InvitationLink).where(InvitationLink.token == token)
    ).scalar_one_or_none()

    if not link:
        raise HTTPException(status_code=404, detail="Invalid invitation link")

    if not link.is_active:
        raise HTTPException(status_code=410, detail="This invitation has been deactivated")

    now = datetime.now(timezone.utc)
    if link.expires_at and link.expires_at < now:
        raise HTTPException(status_code=410, detail="This invitation has expired")

    if link.max_uses is not None and link.use_count >= link.max_uses:
        raise HTTPException(status_code=410, detail="This invitation has reached its usage limit")

    # Check seat limits
    subscription = get_org_subscription(db, link.org_id)
    if subscription and subscription.seats_limit > 0:
        current_count = db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.org_id == link.org_id
            )
        ).scalar() or 0
        if current_count >= subscription.seats_limit:
            raise HTTPException(
                status_code=403,
                detail="Organization has reached its seat limit",
            )

    # Check if already a member
    existing = db.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user.id,
            OrganizationMember.org_id == link.org_id,
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="You are already a member of this organization")

    # Get org name for response
    org = db.execute(
        select(Organization).where(Organization.id == link.org_id)
    ).scalar_one_or_none()

    # Add member
    membership = OrganizationMember(
        user_id=user.id,
        org_id=link.org_id,
        role=link.role,
    )
    db.add(membership)

    # Increment use count
    link.use_count = link.use_count + 1
    db.commit()

    return {
        "success": True,
        "organization": org.name if org else "Unknown",
        "role": link.role,
    }


@router.get("/{token}/info")
async def get_invite_info(
    token: str,
    db: Session = Depends(get_db),
):
    """Get information about an invitation link (public, no auth required)."""
    link = db.execute(
        select(InvitationLink).where(InvitationLink.token == token)
    ).scalar_one_or_none()

    if not link:
        raise HTTPException(status_code=404, detail="Invalid invitation link")

    org = db.execute(
        select(Organization).where(Organization.id == link.org_id)
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    is_expired = link.expires_at is not None and link.expires_at < now
    is_full = link.max_uses is not None and link.use_count >= link.max_uses

    return {
        "organization_name": org.name if org else "Unknown",
        "role": link.role,
        "is_valid": link.is_active and not is_expired and not is_full,
        "is_expired": is_expired,
        "is_full": is_full,
    }


@router.delete("/{link_id}")
async def deactivate_invite_link(
    link_id: int,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Deactivate an invitation link."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info
    link = db.execute(
        select(InvitationLink).where(
            InvitationLink.id == link_id,
            InvitationLink.org_id == org.id,
        )
    ).scalar_one_or_none()

    if not link:
        raise HTTPException(status_code=404, detail="Invitation link not found")

    link.is_active = False
    db.commit()

    return {"success": True}
