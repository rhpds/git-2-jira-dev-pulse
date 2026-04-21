"""Authentication and authorization middleware/dependencies."""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, FeatureFlag
from ..services.auth_service import decode_token, get_user_by_id, get_user_organization, validate_api_key

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the current user from JWT or API key."""
    # Try API key first
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
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get the current user if authenticated, or None."""
    try:
        return await get_current_user(credentials, x_api_key, db)
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
