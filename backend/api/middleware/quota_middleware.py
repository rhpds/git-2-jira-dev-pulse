"""Quota enforcement dependencies for FastAPI routes."""
from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User
from ..services.auth_service import get_user_organization
from ..services.usage_service import check_quota
from ..middleware.auth_middleware import get_current_user, get_optional_user


def enforce_repo_quota():
    """Dependency that enforces repository scanning quota."""

    async def _check(
        user: User = Depends(get_optional_user),
        db: Session = Depends(get_db),
    ):
        if not user:
            return  # Unauthenticated — no quota to enforce

        org_info = get_user_organization(db, user.id)
        if not org_info:
            return

        org, _role = org_info
        allowed, message = check_quota(db, org.id, "repos")
        if not allowed:
            raise HTTPException(status_code=403, detail=message)

    return _check


def enforce_integration_quota():
    """Dependency that enforces integration count quota."""

    async def _check(
        user: User = Depends(get_optional_user),
        db: Session = Depends(get_db),
    ):
        if not user:
            return

        org_info = get_user_organization(db, user.id)
        if not org_info:
            return

        org, _role = org_info
        allowed, message = check_quota(db, org.id, "integrations")
        if not allowed:
            raise HTTPException(status_code=403, detail=message)

    return _check


def enforce_seat_quota():
    """Dependency that enforces team seat quota."""

    async def _check(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        org_info = get_user_organization(db, user.id)
        if not org_info:
            return

        org, _role = org_info
        allowed, message = check_quota(db, org.id, "seats")
        if not allowed:
            raise HTTPException(status_code=403, detail=message)

    return _check
