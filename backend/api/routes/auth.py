"""Authentication API routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends, Request
from jose import JWTError
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, Organization, OrganizationMember, Subscription, APIKey
from ..models.auth_models import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    TokenRefreshRequest,
    UserProfile,
    UserUpdateRequest,
    PasswordChangeRequest,
    OrganizationInfo,
    SubscriptionInfo,
    APIKeyCreateRequest,
    APIKeyResponse,
)
from ..services.auth_service import (
    register_user,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_user_organization,
    get_org_subscription,
    hash_password,
    verify_password,
    create_api_key,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(
    request: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Register a new user account."""
    try:
        user = register_user(
            db,
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            org_name=request.org_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    org_info = get_user_organization(db, user.id)
    org_id = org_info[0].id if org_info else None

    access_token = create_access_token(user.id, org_id=org_id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login")
async def login(
    request: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate and get access tokens."""
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    org_info = get_user_organization(db, user.id)
    org_id = org_info[0].id if org_info else None

    access_token = create_access_token(user.id, org_id=org_id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh")
async def refresh_token(
    request: TokenRefreshRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Refresh an access token."""
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    stmt = select(User).where(User.id == user_id)
    user = db.execute(stmt).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    org_info = get_user_organization(db, user.id)
    org_id = org_info[0].id if org_info else None

    access_token = create_access_token(user.id, org_id=org_id)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me")
async def get_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    """Get the current user's profile."""
    org_info_result = get_user_organization(db, user.id)

    org_response = None
    sub_response = None

    if org_info_result:
        org, role = org_info_result
        member_count = db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.org_id == org.id
            )
        ).scalar() or 0

        org_response = OrganizationInfo(
            id=org.id,
            name=org.name,
            slug=org.slug,
            role=role,
            member_count=member_count,
        )

        subscription = get_org_subscription(db, org.id)
        if subscription:
            sub_response = SubscriptionInfo(
                plan=subscription.plan,
                status=subscription.status,
                seats_limit=subscription.seats_limit,
                repos_limit=subscription.repos_limit,
                integrations_limit=subscription.integrations_limit,
                current_period_end=subscription.current_period_end,
                trial_end=subscription.trial_end,
                cancel_at=subscription.cancel_at,
            )

    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        role=user.role,
        created_at=user.created_at,
        last_login=user.last_login,
        organization=org_response,
        subscription=sub_response,
    )


@router.put("/me")
async def update_profile(
    request: UserUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update the current user's profile."""
    if request.full_name is not None:
        user.full_name = request.full_name
    if request.avatar_url is not None:
        user.avatar_url = request.avatar_url

    db.commit()
    db.refresh(user)

    return {"success": True, "message": "Profile updated"}


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Change the current user's password."""
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password_hash = hash_password(request.new_password)
    db.commit()

    return {"success": True, "message": "Password changed"}


@router.post("/api-keys")
async def create_api_key_endpoint(
    request: APIKeyCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> APIKeyResponse:
    """Create a new API key."""
    key_record, raw_key = create_api_key(
        db,
        user_id=user.id,
        name=request.name,
        scopes=request.scopes,
        expires_in_days=request.expires_in_days,
    )

    return APIKeyResponse(
        id=key_record.id,
        name=key_record.name,
        prefix=key_record.prefix,
        key=raw_key,  # Only shown once
        scopes=key_record.scopes,
        last_used=key_record.last_used,
        expires_at=key_record.expires_at,
        is_active=key_record.is_active,
        created_at=key_record.created_at,
    )


@router.get("/api-keys")
async def list_api_keys(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[APIKeyResponse]:
    """List the current user's API keys."""
    stmt = select(APIKey).where(APIKey.user_id == user.id).order_by(APIKey.created_at.desc())
    keys = db.execute(stmt).scalars().all()

    return [
        APIKeyResponse(
            id=key.id,
            name=key.name,
            prefix=key.prefix,
            scopes=key.scopes,
            last_used=key.last_used,
            expires_at=key.expires_at,
            is_active=key.is_active,
            created_at=key.created_at,
        )
        for key in keys
    ]


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Revoke an API key."""
    stmt = select(APIKey).where(APIKey.id == key_id, APIKey.user_id == user.id)
    key = db.execute(stmt).scalar_one_or_none()

    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key.is_active = False
    db.commit()

    return {"success": True, "message": "API key revoked"}
