"""Saved filter presets API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, FilterPreset
from ..middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/filter-presets", tags=["filter-presets"])


class CreatePresetRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    search_term: str = ""
    activity_filter: str = "all"
    status_filter: str = "all"
    branch_filter: str = "all"
    is_default: bool = False


class UpdatePresetRequest(BaseModel):
    name: str | None = None
    search_term: str | None = None
    activity_filter: str | None = None
    status_filter: str | None = None
    branch_filter: str | None = None
    is_default: bool | None = None


def _preset_to_dict(p: FilterPreset) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "search_term": p.search_term or "",
        "activity_filter": p.activity_filter or "all",
        "status_filter": p.status_filter or "all",
        "branch_filter": p.branch_filter or "all",
        "is_default": bool(p.is_default),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("/")
async def list_presets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all saved filter presets for the current user."""
    stmt = (
        select(FilterPreset)
        .where(FilterPreset.user_id == user.id)
        .order_by(FilterPreset.created_at)
    )
    presets = list(db.execute(stmt).scalars().all())
    return {"presets": [_preset_to_dict(p) for p in presets]}


@router.post("/")
async def create_preset(
    request: CreatePresetRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a new filter preset."""
    # Check for duplicate name
    existing = db.execute(
        select(FilterPreset).where(
            FilterPreset.user_id == user.id,
            FilterPreset.name == request.name,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="A preset with this name already exists")

    # If setting as default, unset other defaults
    if request.is_default:
        stmt = select(FilterPreset).where(
            FilterPreset.user_id == user.id,
            FilterPreset.is_default == True,
        )
        for p in db.execute(stmt).scalars().all():
            p.is_default = False

    preset = FilterPreset(
        user_id=user.id,
        name=request.name,
        search_term=request.search_term,
        activity_filter=request.activity_filter,
        status_filter=request.status_filter,
        branch_filter=request.branch_filter,
        is_default=request.is_default,
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return _preset_to_dict(preset)


@router.put("/{preset_id}")
async def update_preset(
    preset_id: int,
    request: UpdatePresetRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a filter preset."""
    preset = db.execute(
        select(FilterPreset).where(
            FilterPreset.id == preset_id,
            FilterPreset.user_id == user.id,
        )
    ).scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    if request.name is not None:
        preset.name = request.name
    if request.search_term is not None:
        preset.search_term = request.search_term
    if request.activity_filter is not None:
        preset.activity_filter = request.activity_filter
    if request.status_filter is not None:
        preset.status_filter = request.status_filter
    if request.branch_filter is not None:
        preset.branch_filter = request.branch_filter
    if request.is_default is not None:
        if request.is_default:
            # Unset other defaults
            stmt = select(FilterPreset).where(
                FilterPreset.user_id == user.id,
                FilterPreset.is_default == True,
                FilterPreset.id != preset_id,
            )
            for p in db.execute(stmt).scalars().all():
                p.is_default = False
        preset.is_default = request.is_default

    db.commit()
    db.refresh(preset)
    return _preset_to_dict(preset)


@router.delete("/{preset_id}")
async def delete_preset(
    preset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a filter preset."""
    preset = db.execute(
        select(FilterPreset).where(
            FilterPreset.id == preset_id,
            FilterPreset.user_id == user.id,
        )
    ).scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    db.delete(preset)
    db.commit()
    return {"success": True}
