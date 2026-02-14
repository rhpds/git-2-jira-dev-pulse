"""Organization management API routes."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, Organization, OrganizationMember, Subscription
from ..models.auth_models import (
    OrganizationInfo,
    OrganizationCreateRequest,
    OrganizationMemberInfo,
    InviteMemberRequest,
)
from ..services.auth_service import get_user_organization, get_org_subscription, _generate_slug
from ..middleware.auth_middleware import get_current_user, require_org_role

router = APIRouter(prefix="/api/org", tags=["organization"])


@router.get("/")
async def get_organization(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationInfo:
    """Get the current user's organization."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, role = org_info
    member_count = db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.org_id == org.id
        )
    ).scalar() or 0

    return OrganizationInfo(
        id=org.id,
        name=org.name,
        slug=org.slug,
        role=role,
        member_count=member_count,
    )


@router.put("/")
async def update_organization(
    request: OrganizationCreateRequest,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
) -> OrganizationInfo:
    """Update organization details (admin+ only)."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, role = org_info
    org.name = request.name
    if request.slug:
        # Check slug uniqueness
        existing = db.execute(
            select(Organization).where(
                Organization.slug == request.slug,
                Organization.id != org.id,
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already taken")
        org.slug = request.slug
    else:
        org.slug = _generate_slug(request.name)

    org.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(org)

    member_count = db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.org_id == org.id
        )
    ).scalar() or 0

    return OrganizationInfo(
        id=org.id,
        name=org.name,
        slug=org.slug,
        role=role,
        member_count=member_count,
    )


@router.get("/members")
async def list_members(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OrganizationMemberInfo]:
    """List all members of the organization."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info

    stmt = (
        select(OrganizationMember, User)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.org_id == org.id)
        .order_by(OrganizationMember.joined_at.asc())
    )
    results = db.execute(stmt).all()

    return [
        OrganizationMemberInfo(
            user_id=member.user_id,
            email=u.email,
            full_name=u.full_name,
            role=member.role,
            joined_at=member.joined_at,
        )
        for member, u in results
    ]


@router.post("/members")
async def invite_member(
    request: InviteMemberRequest,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
) -> OrganizationMemberInfo:
    """Invite a user to the organization (admin+ only)."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info

    # Check seat limits
    subscription = get_org_subscription(db, org.id)
    if subscription and subscription.seats_limit > 0:
        current_count = db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.org_id == org.id
            )
        ).scalar() or 0
        if current_count >= subscription.seats_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Seat limit reached ({subscription.seats_limit}). Upgrade your plan to add more members.",
            )

    # Find or error on user
    stmt = select(User).where(User.email == request.email)
    target_user = db.execute(stmt).scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail=f"No user found with email {request.email}. They must register first.",
        )

    # Check if already a member
    existing = db.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == target_user.id,
            OrganizationMember.org_id == org.id,
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    # Validate role
    valid_roles = ["viewer", "member", "admin"]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    membership = OrganizationMember(
        user_id=target_user.id,
        org_id=org.id,
        role=request.role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)

    return OrganizationMemberInfo(
        user_id=target_user.id,
        email=target_user.email,
        full_name=target_user.full_name,
        role=membership.role,
        joined_at=membership.joined_at,
    )


@router.put("/members/{user_id}/role")
async def update_member_role(
    user_id: int,
    request: InviteMemberRequest,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Update a member's role (admin+ only)."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info

    stmt = select(OrganizationMember).where(
        OrganizationMember.user_id == user_id,
        OrganizationMember.org_id == org.id,
    )
    membership = db.execute(stmt).scalar_one_or_none()

    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    # Cannot change owner role
    if membership.role == "owner":
        raise HTTPException(status_code=403, detail="Cannot change the owner's role")

    valid_roles = ["viewer", "member", "admin"]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    membership.role = request.role
    db.commit()

    return {"success": True, "message": f"Role updated to {request.role}"}


@router.delete("/members/{user_id}")
async def remove_member(
    user_id: int,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Remove a member from the organization (admin+ only)."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=404, detail="No organization found")

    org, _role = org_info

    stmt = select(OrganizationMember).where(
        OrganizationMember.user_id == user_id,
        OrganizationMember.org_id == org.id,
    )
    membership = db.execute(stmt).scalar_one_or_none()

    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    if membership.role == "owner":
        raise HTTPException(status_code=403, detail="Cannot remove the organization owner")

    db.delete(membership)
    db.commit()

    return {"success": True, "message": "Member removed"}
