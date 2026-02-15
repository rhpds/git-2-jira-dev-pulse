"""Session management API routes."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, desc, delete
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, UserSession
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth/sessions", tags=["sessions"])


def _hash_token(token: str) -> str:
    """Create a hash of a token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def _parse_device(user_agent: str) -> str:
    """Extract a friendly device name from user agent."""
    ua = user_agent.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        if "android" in ua:
            return "Android Device"
        if "iphone" in ua:
            return "iPhone"
        return "Mobile Device"
    if "mac" in ua:
        return "Mac"
    if "windows" in ua:
        return "Windows PC"
    if "linux" in ua:
        return "Linux"
    if "curl" in ua or "httpx" in ua or "python" in ua:
        return "API Client"
    return "Unknown Device"


def record_session(
    db: Session,
    user_id: int,
    token: str,
    request: Request,
) -> UserSession:
    """Record a new login session."""
    ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if not ip and request.client:
        ip = request.client.host

    user_agent = request.headers.get("User-Agent", "")
    device_name = _parse_device(user_agent)

    session = UserSession(
        user_id=user_id,
        token_hash=_hash_token(token),
        ip_address=ip,
        user_agent=user_agent[:500],
        device_name=device_name,
    )
    db.add(session)
    db.flush()
    return session


@router.get("/")
async def list_sessions(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all active sessions for the current user."""
    stmt = (
        select(UserSession)
        .where(UserSession.user_id == user.id)
        .order_by(desc(UserSession.last_active))
    )
    sessions = list(db.execute(stmt).scalars().all())

    # Detect current session from Authorization header
    auth_header = request.headers.get("Authorization", "")
    current_token_hash = None
    if auth_header.startswith("Bearer "):
        current_token_hash = _hash_token(auth_header[7:])

    return {
        "sessions": [
            {
                "id": s.id,
                "device_name": s.device_name,
                "ip_address": s.ip_address,
                "user_agent": s.user_agent,
                "is_current": s.token_hash == current_token_hash,
                "last_active": s.last_active.isoformat() if s.last_active else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ],
        "total": len(sessions),
    }


@router.delete("/{session_id}")
async def revoke_session(
    session_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a specific session."""
    stmt = select(UserSession).where(
        UserSession.id == session_id,
        UserSession.user_id == user.id,
    )
    session_record = db.execute(stmt).scalar_one_or_none()

    if not session_record:
        raise HTTPException(status_code=404, detail="Session not found")

    # Don't allow revoking current session via this endpoint
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        current_hash = _hash_token(auth_header[7:])
        if session_record.token_hash == current_hash:
            raise HTTPException(
                status_code=400,
                detail="Cannot revoke current session. Use logout instead.",
            )

    db.delete(session_record)
    db.commit()

    return {"success": True, "message": "Session revoked"}


@router.post("/revoke-all")
async def revoke_all_other_sessions(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke all sessions except the current one."""
    auth_header = request.headers.get("Authorization", "")
    current_hash = None
    if auth_header.startswith("Bearer "):
        current_hash = _hash_token(auth_header[7:])

    stmt = select(UserSession).where(UserSession.user_id == user.id)
    sessions = list(db.execute(stmt).scalars().all())

    revoked = 0
    for s in sessions:
        if s.token_hash != current_hash:
            db.delete(s)
            revoked += 1

    db.commit()
    return {"success": True, "revoked_count": revoked}
