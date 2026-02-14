"""Authentication service with JWT token management."""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import hashlib

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.db_models import User, Organization, OrganizationMember, Subscription, APIKey
from ..models.billing_models import PLAN_LIMITS
from ..logging_config import get_logger

logger = get_logger(__name__)

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(64))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Password hashing using hashlib (bcrypt/passlib has compatibility issues with bcrypt 5.x)
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600000)
    return f"pbkdf2:{salt}:{hashed.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        _, salt, stored_hash = hashed_password.split(":")
        computed = hashlib.pbkdf2_hmac("sha256", plain_password.encode(), salt.encode(), 600000)
        return computed.hex() == stored_hash
    except (ValueError, AttributeError):
        return False


def create_access_token(user_id: int, org_id: Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "exp": expire,
    }
    if org_id:
        payload["org_id"] = org_id
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises JWTError on failure."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def register_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    org_name: Optional[str] = None,
) -> User:
    """Register a new user and optionally create an organization."""
    # Check for existing user
    stmt = select(User).where(User.email == email)
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        raise ValueError("Email already registered")

    # Create user
    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        is_verified=True,  # Auto-verify for now
    )
    db.add(user)
    db.flush()  # Get user ID

    # Create personal organization
    slug = _generate_slug(org_name or full_name)
    org = Organization(
        name=org_name or f"{full_name}'s Workspace",
        slug=slug,
        owner_id=user.id,
    )
    db.add(org)
    db.flush()

    # Add user as owner
    membership = OrganizationMember(
        user_id=user.id,
        org_id=org.id,
        role="owner",
    )
    db.add(membership)

    # Create free subscription
    free_plan = PLAN_LIMITS["free"]
    subscription = Subscription(
        org_id=org.id,
        plan="free",
        status="active",
        seats_limit=free_plan["seats"],
        repos_limit=free_plan["repos"],
        integrations_limit=free_plan["integrations"],
    )
    db.add(subscription)
    db.commit()
    db.refresh(user)

    logger.info(f"User registered: {email}, org: {org.name}")
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user by email and password."""
    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        return None

    if not user.is_active:
        return None

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    stmt = select(User).where(User.id == user_id)
    return db.execute(stmt).scalar_one_or_none()


def get_user_organization(db: Session, user_id: int) -> Optional[tuple[Organization, str]]:
    """Get the user's primary organization and their role in it."""
    stmt = (
        select(OrganizationMember)
        .where(OrganizationMember.user_id == user_id)
        .order_by(OrganizationMember.joined_at.asc())
    )
    membership = db.execute(stmt).scalar_one_or_none()
    if not membership:
        return None

    stmt_org = select(Organization).where(Organization.id == membership.org_id)
    org = db.execute(stmt_org).scalar_one_or_none()
    if not org:
        return None

    return org, membership.role


def get_org_subscription(db: Session, org_id: int) -> Optional[Subscription]:
    stmt = select(Subscription).where(Subscription.org_id == org_id)
    return db.execute(stmt).scalar_one_or_none()


def create_api_key(db: Session, user_id: int, name: str, scopes: Optional[list[str]] = None, expires_in_days: Optional[int] = None) -> tuple[APIKey, str]:
    """Create an API key. Returns (key_record, raw_key)."""
    raw_key = f"dp_{secrets.token_urlsafe(32)}"
    prefix = raw_key[:10]

    api_key = APIKey(
        user_id=user_id,
        key_hash=hash_password(raw_key),
        name=name,
        prefix=prefix,
        scopes=scopes,
        expires_at=datetime.now(timezone.utc) + timedelta(days=expires_in_days) if expires_in_days else None,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return api_key, raw_key


def validate_api_key(db: Session, raw_key: str) -> Optional[User]:
    """Validate an API key and return the associated user."""
    prefix = raw_key[:10]
    stmt = select(APIKey).where(APIKey.prefix == prefix, APIKey.is_active == True)
    keys = db.execute(stmt).scalars().all()

    for key in keys:
        if verify_password(raw_key, key.key_hash):
            # Check expiration
            if key.expires_at and key.expires_at < datetime.now(timezone.utc):
                return None
            # Update last used
            key.last_used = datetime.now(timezone.utc)
            db.commit()
            return get_user_by_id(db, key.user_id)

    return None


def _generate_slug(name: str) -> str:
    """Generate a URL-safe slug from a name."""
    import re
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug or "workspace"
