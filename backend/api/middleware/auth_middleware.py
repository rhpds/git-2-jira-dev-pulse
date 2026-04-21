"""Authentication and authorization middleware/dependencies."""
from __future__ import annotations

import os
from typing import Optional

from fastapi import Depends, HTTPException, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, FeatureFlag, Organization, OrganizationMember, Subscription
from ..services.auth_service import decode_token, get_user_by_id, get_user_organization, validate_api_key, _generate_slug

security = HTTPBearer(auto_error=False)

TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"


def _get_or_create_proxy_user(db: Session, email: str, name: str) -> User:
    """Find or create a user from oauth-proxy headers."""
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user:
        return user

    user = User(
        email=email,
        password_hash="proxy:openshift",
        full_name=name or email.split("@")[0],
        is_verified=True,
        oauth_provider="openshift",
    )
    db.add(user)
    db.flush()

    slug = _generate_slug(user.full_name)
    org = Organization(
        name=f"{user.full_name}'s Workspace",
        slug=slug,
        owner_id=user.id,
    )
    db.add(org)
    db.flush()

    membership = OrganizationMember(user_id=user.id, org_id=org.id, role="owner")
    db.add(membership)

    subscription = Subscription(
        org_id=org.id, plan="free", status="active", seats_limit=999, repos_limit=999,
    )
    db.add(subscription)
    db.commit()
    db.refresh(user)
    return user


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the current user from proxy headers, JWT, or API key."""
    # Trust OCP oauth-proxy headers when configured
    if TRUST_PROXY_HEADERS:
        proxy_email = request.headers.get("X-Forwarded-Email")
        proxy_user = request.headers.get("X-Forwarded-User")
        if proxy_email or proxy_user:
            email = proxy_email or proxy_user
            name = request.headers.get("X-Forwarded-Preferred-Username", "")
            return _get_or_create_proxy_user(db, email, name)

    # Try API key
    if x_api_key:
        user = validate_api_key(db, x_api_key)
        if user:
            return user
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Try JWT
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get the current user if authenticated, or None."""
    try:
        return await get_current_user(request, credentials, x_api_key, db)
    except HTTPException:
        return None


def require_plan(min_plan: str):
    """Plan gating removed -- all features available."""
    async def check_plan(user: User = Depends(get_current_user)):
        return user
    return check_plan


def require_feature(feature_key: str):
    """Feature gating removed -- all features available."""
    async def check_feature(user: User = Depends(get_current_user)):
        return user
    return check_feature


def require_org_role(min_role: str = "member"):
    """Dependency that requires a minimum organization role."""
    role_hierarchy = ["viewer", "member", "admin", "owner"]
    min_idx = role_hierarchy.index(min_role)

    async def check_role(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        org_info = get_user_organization(db, user.id)
        if not org_info:
            raise HTTPException(status_code=403, detail="No organization found")

        _org, role = org_info
        role_idx = role_hierarchy.index(role)

        if role_idx < min_idx:
            raise HTTPException(
                status_code=403,
                detail=f"This action requires {min_role} role or higher.",
            )

        return user

    return check_role
