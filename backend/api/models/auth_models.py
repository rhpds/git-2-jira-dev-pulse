"""Pydantic models for authentication and authorization."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=200)
    org_name: Optional[str] = Field(None, max_length=200)


class UserLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    role: str
    onboarding_completed: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None
    organization: Optional[OrganizationInfo] = None
    subscription: Optional[SubscriptionInfo] = None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class OrganizationInfo(BaseModel):
    id: int
    name: str
    slug: str
    role: str  # User's role in the org
    member_count: int = 0

    model_config = {"from_attributes": True}


class OrganizationCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: Optional[str] = Field(None, max_length=100)


class OrganizationMemberInfo(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class InviteMemberRequest(BaseModel):
    email: str
    role: str = "member"


class SubscriptionInfo(BaseModel):
    plan: str
    status: str
    seats_limit: int
    repos_limit: int
    integrations_limit: int
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    cancel_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class APIKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    scopes: Optional[list[str]] = None
    expires_in_days: Optional[int] = None


class APIKeyResponse(BaseModel):
    id: int
    name: str
    prefix: str
    key: Optional[str] = None  # Only returned on creation
    scopes: Optional[list[str]] = None
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# Forward reference resolution
UserProfile.model_rebuild()
