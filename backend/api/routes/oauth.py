"""OAuth authentication routes (GitHub, OIDC/Red Hat SSO)."""
from __future__ import annotations

import os
import secrets
import time
from urllib.parse import urlencode

import httpx
from cachetools import TTLCache
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, Organization, OrganizationMember, Subscription
from ..models.auth_models import TokenResponse
from ..services.auth_service import (
    create_access_token,
    create_refresh_token,
    get_user_organization,
    _generate_slug,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix="/api/oauth", tags=["oauth"])

# GitHub OAuth configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_OAUTH_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_OAUTH_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:9000/api/oauth/github/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:6100")

# OIDC / Red Hat SSO configuration
OIDC_ISSUER_URL = os.getenv("OIDC_ISSUER_URL", "")
OIDC_CLIENT_ID = os.getenv("OIDC_CLIENT_ID", "")
OIDC_CLIENT_SECRET = os.getenv("OIDC_CLIENT_SECRET", "")
OIDC_REDIRECT_URI = os.getenv("OIDC_REDIRECT_URI", "")
OIDC_SCOPES = os.getenv("OIDC_SCOPES", "openid email profile")

# In-memory state store for CSRF protection
_oauth_states: dict[str, bool] = {}
_auth_codes: TTLCache = TTLCache(maxsize=1000, ttl=120)

# Cached OIDC discovery metadata
_oidc_config: dict[str, str] = {}


@router.get("/github/authorize")
async def github_authorize():
    """Redirect to GitHub OAuth authorization page."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GitHub OAuth not configured")

    state = secrets.token_urlsafe(32)
    _oauth_states[state] = True

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "read:user user:email",
        "state": state,
    }
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    return {"authorize_url": f"https://github.com/login/oauth/authorize?{query_string}"}


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """Handle GitHub OAuth callback."""
    # Verify state
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    del _oauth_states[state]

    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="GitHub OAuth not configured")

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )

    if token_response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to exchange OAuth code")

    token_data = token_response.json()
    access_token_gh = token_data.get("access_token")
    if not access_token_gh:
        error = token_data.get("error_description", "Unknown error")
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")

    # Get GitHub user info
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token_gh}",
                "Accept": "application/vnd.github+json",
            },
        )
        emails_response = await client.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {access_token_gh}",
                "Accept": "application/vnd.github+json",
            },
        )

    if user_response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to get GitHub user info")

    gh_user = user_response.json()
    github_id = str(gh_user["id"])
    github_username = gh_user.get("login", "")
    full_name = gh_user.get("name") or github_username
    avatar_url = gh_user.get("avatar_url")

    # Get primary email
    email = None
    if emails_response.status_code == 200:
        for e in emails_response.json():
            if e.get("primary") and e.get("verified"):
                email = e["email"]
                break
    if not email:
        email = gh_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No verified email found on GitHub account")

    # Find or create user
    user = db.execute(
        select(User).where(User.github_id == github_id)
    ).scalar_one_or_none()

    if not user:
        # Check if email already registered
        user = db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()

        if user:
            # Link GitHub to existing account
            user.github_id = github_id
            user.github_username = github_username
            user.oauth_provider = "github"
            if not user.avatar_url:
                user.avatar_url = avatar_url
        else:
            # Create new user
            user = User(
                email=email,
                password_hash="oauth:github",  # No password for OAuth users
                full_name=full_name,
                avatar_url=avatar_url,
                is_verified=True,
                github_id=github_id,
                github_username=github_username,
                oauth_provider="github",
            )
            db.add(user)
            db.flush()

            # Create personal organization
            slug = _generate_slug(full_name)
            org = Organization(
                name=f"{full_name}'s Workspace",
                slug=slug,
                owner_id=user.id,
            )
            db.add(org)
            db.flush()

            membership = OrganizationMember(
                user_id=user.id,
                org_id=org.id,
                role="owner",
            )
            db.add(membership)

            subscription = Subscription(
                org_id=org.id,
                plan="free",
                status="active",
                seats_limit=999,
                repos_limit=999,
            )
            db.add(subscription)

    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    # Generate tokens
    org_info = get_user_organization(db, user.id)
    org_id = org_info[0].id if org_info else None

    access_token = create_access_token(user.id, org_id=org_id)
    refresh_token = create_refresh_token(user.id)

    auth_code = secrets.token_urlsafe(32)
    _auth_codes[auth_code] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "created": time.time(),
    }
    return RedirectResponse(url=f"{FRONTEND_URL}/oauth/callback?code={auth_code}")


@router.post("/exchange")
async def exchange_code(code: str):
    """Exchange a one-time auth code for tokens."""
    token_data = _auth_codes.pop(code, None)
    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid or expired auth code")
    return TokenResponse(
        access_token=token_data["access_token"],
        refresh_token=token_data["refresh_token"],
        expires_in=token_data["expires_in"],
    )


async def _get_oidc_config() -> dict[str, str]:
    """Fetch and cache OIDC discovery document."""
    global _oidc_config
    if _oidc_config:
        return _oidc_config
    if not OIDC_ISSUER_URL:
        raise HTTPException(status_code=503, detail="OIDC not configured")
    well_known = f"{OIDC_ISSUER_URL.rstrip('/')}/.well-known/openid-configuration"
    async with httpx.AsyncClient() as client:
        resp = await client.get(well_known, timeout=10)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch OIDC discovery document")
    _oidc_config = resp.json()
    return _oidc_config


@router.get("/oidc/authorize")
async def oidc_authorize():
    """Return the OIDC authorization URL for Red Hat SSO."""
    if not OIDC_CLIENT_ID or not OIDC_ISSUER_URL:
        raise HTTPException(status_code=503, detail="OIDC not configured")

    config = await _get_oidc_config()
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = True

    redirect_uri = OIDC_REDIRECT_URI or f"{FRONTEND_URL}/oauth/callback"
    params = {
        "client_id": OIDC_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": OIDC_SCOPES,
        "state": state,
    }
    authorize_url = f"{config['authorization_endpoint']}?{urlencode(params)}"
    return {"authorize_url": authorize_url}


@router.get("/oidc/callback")
async def oidc_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """Handle OIDC callback from Red Hat SSO."""
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    del _oauth_states[state]

    if not OIDC_CLIENT_ID or not OIDC_ISSUER_URL:
        raise HTTPException(status_code=503, detail="OIDC not configured")

    config = await _get_oidc_config()
    redirect_uri = OIDC_REDIRECT_URI or f"{FRONTEND_URL}/oauth/callback"

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            config["token_endpoint"],
            data={
                "grant_type": "authorization_code",
                "client_id": OIDC_CLIENT_ID,
                "client_secret": OIDC_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="OIDC token exchange failed")

    token_data = token_resp.json()
    id_token = token_data.get("access_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="No access token in OIDC response")

    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            config["userinfo_endpoint"],
            headers={"Authorization": f"Bearer {id_token}"},
            timeout=10,
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to get user info from OIDC provider")

    userinfo = userinfo_resp.json()
    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email in OIDC user info")
    full_name = userinfo.get("name") or userinfo.get("preferred_username") or email.split("@")[0]
    sub = userinfo.get("sub", "")

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            password_hash=f"oauth:oidc:{sub}",
            full_name=full_name,
            is_verified=True,
            oauth_provider="oidc",
        )
        db.add(user)
        db.flush()

        slug = _generate_slug(full_name)
        org = Organization(
            name=f"{full_name}'s Workspace",
            slug=slug,
            owner_id=user.id,
        )
        db.add(org)
        db.flush()

        membership = OrganizationMember(
            user_id=user.id,
            org_id=org.id,
            role="owner",
        )
        db.add(membership)

        subscription = Subscription(
            org_id=org.id,
            plan="free",
            status="active",
            seats_limit=999,
            repos_limit=999,
        )
        db.add(subscription)
    else:
        if not user.oauth_provider:
            user.oauth_provider = "oidc"

    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    org_info = get_user_organization(db, user.id)
    org_id = org_info[0].id if org_info else None

    access_token = create_access_token(user.id, org_id=org_id)
    refresh_token = create_refresh_token(user.id)

    auth_code = secrets.token_urlsafe(32)
    _auth_codes[auth_code] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "created": time.time(),
    }
    return RedirectResponse(url=f"{FRONTEND_URL}/oauth/callback?code={auth_code}")


@router.get("/oidc/status")
async def oidc_status():
    """Check if OIDC/SSO is configured."""
    return {
        "configured": bool(OIDC_CLIENT_ID and OIDC_ISSUER_URL),
        "issuer": OIDC_ISSUER_URL or None,
    }


@router.get("/github/status")
async def github_oauth_status():
    """Check if GitHub OAuth is configured."""
    return {
        "configured": bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET),
        "client_id": GITHUB_CLIENT_ID[:8] + "..." if GITHUB_CLIENT_ID else None,
    }
