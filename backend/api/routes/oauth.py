"""OAuth authentication routes (GitHub)."""
from __future__ import annotations

import os
import secrets

import httpx
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, Organization, OrganizationMember, Subscription
from ..models.billing_models import PLAN_LIMITS
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

# In-memory state store for CSRF protection
_oauth_states: dict[str, bool] = {}


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

    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    # Generate tokens
    org_info = get_user_organization(db, user.id)
    org_id = org_info[0].id if org_info else None

    access_token = create_access_token(user.id, org_id=org_id)
    refresh_token = create_refresh_token(user.id)

    # Redirect to frontend with tokens
    return RedirectResponse(
        url=f"{FRONTEND_URL}/oauth/callback?access_token={access_token}&refresh_token={refresh_token}&expires_in={ACCESS_TOKEN_EXPIRE_MINUTES * 60}"
    )


@router.get("/github/status")
async def github_oauth_status():
    """Check if GitHub OAuth is configured."""
    return {
        "configured": bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET),
        "client_id": GITHUB_CLIENT_ID[:8] + "..." if GITHUB_CLIENT_ID else None,
    }
