"""Repository favorites/starred repos API routes."""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, FavoriteRepo
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


class FavoriteRequest(BaseModel):
    repo_path: str
    repo_name: str | None = None


@router.get("/")
async def list_favorites(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all favorited repositories for the current user."""
    stmt = (
        select(FavoriteRepo)
        .where(FavoriteRepo.user_id == user.id)
        .order_by(FavoriteRepo.created_at.desc())
    )
    favorites = list(db.execute(stmt).scalars().all())

    return {
        "favorites": [
            {
                "id": f.id,
                "repo_path": f.repo_path,
                "repo_name": f.repo_name or os.path.basename(str(f.repo_path)),
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in favorites
        ],
        "total": len(favorites),
    }


@router.post("/")
async def add_favorite(
    request: FavoriteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a repository to favorites."""
    # Check if already favorited
    existing = db.execute(
        select(FavoriteRepo).where(
            FavoriteRepo.user_id == user.id,
            FavoriteRepo.repo_path == request.repo_path,
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Repository already favorited")

    name = request.repo_name or os.path.basename(request.repo_path)
    fav = FavoriteRepo(
        user_id=user.id,
        repo_path=request.repo_path,
        repo_name=name,
    )
    db.add(fav)
    db.commit()
    db.refresh(fav)

    return {
        "id": fav.id,
        "repo_path": fav.repo_path,
        "repo_name": fav.repo_name,
        "created_at": fav.created_at.isoformat() if fav.created_at else None,
    }


@router.delete("/{repo_path:path}")
async def remove_favorite(
    repo_path: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a repository from favorites."""
    fav = db.execute(
        select(FavoriteRepo).where(
            FavoriteRepo.user_id == user.id,
            FavoriteRepo.repo_path == repo_path,
        )
    ).scalar_one_or_none()

    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(fav)
    db.commit()
    return {"success": True}


@router.get("/check/{repo_path:path}")
async def check_favorite(
    repo_path: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if a repository is favorited."""
    fav = db.execute(
        select(FavoriteRepo).where(
            FavoriteRepo.user_id == user.id,
            FavoriteRepo.repo_path == repo_path,
        )
    ).scalar_one_or_none()

    return {"is_favorite": fav is not None}
