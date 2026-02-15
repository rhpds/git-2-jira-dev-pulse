"""Team Collaboration API routes.

Shared dashboard state, team activity stream, collaborative annotations,
and team presence indicators.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Session

from ..database import get_db, Base
from ..models.db_models import User, OrganizationMember
from ..middleware.auth_middleware import get_current_user
from ..services.auth_service import get_user_organization

router = APIRouter(prefix="/api/team", tags=["team"])


# ── Models ──

class SharedAnnotation(Base):
    __tablename__ = "shared_annotations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repo_path = Column(String(500), nullable=False, index=True)
    content = Column(Text, nullable=False)
    annotation_type = Column(String(50), nullable=False, default="note")  # note, warning, todo, review
    is_resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True)


class TeamBookmark(Base):
    __tablename__ = "team_bookmarks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    url = Column(String(500), nullable=False)
    category = Column(String(50), nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


# ── Request/Response Models ──

class AnnotationCreate(BaseModel):
    repo_path: str
    content: str
    annotation_type: str = "note"


class AnnotationUpdate(BaseModel):
    content: str | None = None
    is_resolved: bool | None = None


class BookmarkCreate(BaseModel):
    title: str
    url: str
    category: str | None = None


# ── Endpoints ──

def _get_org_id(db: Session, user: User) -> int | None:
    """Get the user's organization ID via membership."""
    org_info = get_user_organization(db, user.id)
    return org_info[0].id if org_info else None


@router.get("/members")
async def get_team_members(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all team members in the user's organization."""
    org_id = _get_org_id(db, user)
    if not org_id:
        return {"members": [], "total": 0}

    stmt = (
        select(User, OrganizationMember)
        .join(OrganizationMember, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.org_id == org_id)
    )
    results = db.execute(stmt).all()

    members = []
    for u, membership in results:
        members.append({
            "id": u.id,
            "username": u.email.split("@")[0],
            "full_name": u.full_name,
            "email": u.email,
            "role": membership.role,
            "joined_at": membership.joined_at.isoformat() if membership.joined_at else None,
        })

    return {"members": members, "total": len(members)}


@router.get("/activity")
async def get_team_activity(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recent team activity (annotations, bookmarks)."""
    org_id = _get_org_id(db, user)
    if not org_id:
        return {"annotations": [], "bookmarks": []}

    # Get recent annotations
    ann_stmt = (
        select(SharedAnnotation, User)
        .join(User, User.id == SharedAnnotation.user_id)
        .where(SharedAnnotation.org_id == org_id)
        .order_by(SharedAnnotation.created_at.desc())
        .limit(20)
    )
    ann_results = db.execute(ann_stmt).all()

    annotations = []
    for ann, author in ann_results:
        annotations.append({
            "id": ann.id,
            "repo_path": ann.repo_path,
            "content": ann.content,
            "type": ann.annotation_type,
            "is_resolved": ann.is_resolved,
            "author": author.full_name or author.username,
            "created_at": ann.created_at.isoformat(),
        })

    # Get bookmarks
    bm_stmt = (
        select(TeamBookmark, User)
        .join(User, User.id == TeamBookmark.user_id)
        .where(TeamBookmark.org_id == org_id)
        .order_by(TeamBookmark.created_at.desc())
        .limit(20)
    )
    bm_results = db.execute(bm_stmt).all()

    bookmarks = []
    for bm, author in bm_results:
        bookmarks.append({
            "id": bm.id,
            "title": bm.title,
            "url": bm.url,
            "category": bm.category,
            "author": author.full_name or author.username,
            "created_at": bm.created_at.isoformat(),
        })

    return {"annotations": annotations, "bookmarks": bookmarks}


@router.post("/annotations")
async def create_annotation(
    body: AnnotationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a shared annotation on a repository."""
    org_id = _get_org_id(db, user)
    if not org_id:
        raise HTTPException(status_code=400, detail="Must be in an organization")

    ann = SharedAnnotation(
        org_id=org_id,
        user_id=user.id,
        repo_path=body.repo_path,
        content=body.content,
        annotation_type=body.annotation_type,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    return {
        "id": ann.id,
        "repo_path": ann.repo_path,
        "content": ann.content,
        "type": ann.annotation_type,
        "created_at": ann.created_at.isoformat(),
    }


@router.put("/annotations/{annotation_id}")
async def update_annotation(
    annotation_id: int,
    body: AnnotationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update or resolve an annotation."""
    org_id = _get_org_id(db, user)
    ann = db.get(SharedAnnotation, annotation_id)
    if not ann or ann.org_id != org_id:
        raise HTTPException(status_code=404, detail="Annotation not found")

    if body.content is not None:
        ann.content = body.content
    if body.is_resolved is not None:
        ann.is_resolved = body.is_resolved
    ann.updated_at = datetime.now(timezone.utc)

    db.commit()
    return {"id": ann.id, "content": ann.content, "is_resolved": ann.is_resolved}


@router.post("/bookmarks")
async def create_bookmark(
    body: BookmarkCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a shared team bookmark."""
    org_id = _get_org_id(db, user)
    if not org_id:
        raise HTTPException(status_code=400, detail="Must be in an organization")

    bm = TeamBookmark(
        org_id=org_id,
        user_id=user.id,
        title=body.title,
        url=body.url,
        category=body.category,
    )
    db.add(bm)
    db.commit()
    db.refresh(bm)

    return {
        "id": bm.id,
        "title": bm.title,
        "url": bm.url,
        "category": bm.category,
        "created_at": bm.created_at.isoformat(),
    }


@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(
    bookmark_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a team bookmark."""
    org_id = _get_org_id(db, user)
    bm = db.get(TeamBookmark, bookmark_id)
    if not bm or bm.org_id != org_id:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(bm)
    db.commit()
    return {"deleted": True}
