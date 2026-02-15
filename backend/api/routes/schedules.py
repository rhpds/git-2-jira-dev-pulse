"""Scheduled scan management API routes."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.db_models import User, ScanSchedule
from ..services.auth_service import get_user_organization
from ..middleware.auth_middleware import get_current_user, require_org_role

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


class CreateScheduleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    frequency: str = Field("daily")  # daily, weekly, monthly
    day_of_week: int | None = None  # 0=Mon, 6=Sun
    hour: int = Field(9, ge=0, le=23)  # UTC hour
    directories: list[str] | None = None
    enabled: bool = True


class UpdateScheduleRequest(BaseModel):
    name: str | None = None
    frequency: str | None = None
    day_of_week: int | None = None
    hour: int | None = None
    directories: list[str] | None = None
    enabled: bool | None = None


def _compute_next_run(frequency: str, hour: int, day_of_week: int | None = None) -> datetime:
    """Compute the next run time based on schedule."""
    now = datetime.now(timezone.utc)
    next_run = now.replace(minute=0, second=0, microsecond=0)

    if frequency == "daily":
        next_run = next_run.replace(hour=hour)
        if next_run <= now:
            next_run += timedelta(days=1)
    elif frequency == "weekly":
        dow = day_of_week if day_of_week is not None else 0
        next_run = next_run.replace(hour=hour)
        days_ahead = dow - now.weekday()
        if days_ahead < 0 or (days_ahead == 0 and next_run <= now):
            days_ahead += 7
        next_run += timedelta(days=days_ahead)
    elif frequency == "monthly":
        next_run = next_run.replace(day=1, hour=hour)
        if next_run <= now:
            month = now.month + 1
            year = now.year
            if month > 12:
                month = 1
                year += 1
            next_run = next_run.replace(year=year, month=month)

    return next_run


@router.get("/")
async def list_schedules(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all scan schedules for the user's org."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        return {"schedules": []}

    org, _role = org_info
    stmt = select(ScanSchedule).where(ScanSchedule.org_id == org.id).order_by(ScanSchedule.created_at)
    schedules = list(db.execute(stmt).scalars().all())

    return {
        "schedules": [
            {
                "id": s.id,
                "name": s.name,
                "frequency": s.frequency,
                "day_of_week": s.day_of_week,
                "hour": s.hour,
                "directories": s.directories,
                "enabled": s.enabled,
                "last_run": s.last_run.isoformat() if s.last_run else None,
                "next_run": s.next_run.isoformat() if s.next_run else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in schedules
        ],
    }


@router.post("/")
async def create_schedule(
    request: CreateScheduleRequest,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a new scan schedule."""
    if request.frequency not in ("daily", "weekly", "monthly"):
        raise HTTPException(status_code=400, detail="Frequency must be daily, weekly, or monthly")

    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info
    next_run = _compute_next_run(request.frequency, request.hour, request.day_of_week)

    schedule = ScanSchedule(
        org_id=org.id,
        name=request.name,
        frequency=request.frequency,
        day_of_week=request.day_of_week,
        hour=request.hour,
        directories=request.directories,
        enabled=request.enabled,
        next_run=next_run,
        created_by=user.id,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return {
        "id": schedule.id,
        "name": schedule.name,
        "frequency": schedule.frequency,
        "next_run": schedule.next_run.isoformat() if schedule.next_run else None,
    }


@router.put("/{schedule_id}")
async def update_schedule(
    schedule_id: int,
    request: UpdateScheduleRequest,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Update a scan schedule."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info
    stmt = select(ScanSchedule).where(
        ScanSchedule.id == schedule_id,
        ScanSchedule.org_id == org.id,
    )
    schedule = db.execute(stmt).scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if request.name is not None:
        schedule.name = request.name
    if request.frequency is not None:
        schedule.frequency = request.frequency
    if request.day_of_week is not None:
        schedule.day_of_week = request.day_of_week
    if request.hour is not None:
        schedule.hour = request.hour
    if request.directories is not None:
        schedule.directories = request.directories
    if request.enabled is not None:
        schedule.enabled = request.enabled

    # Recompute next run
    schedule.next_run = _compute_next_run(
        schedule.frequency, schedule.hour, schedule.day_of_week
    )

    db.commit()
    return {"success": True, "next_run": schedule.next_run.isoformat() if schedule.next_run else None}


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    user: User = Depends(require_org_role("admin")),
    db: Session = Depends(get_db),
):
    """Delete a scan schedule."""
    org_info = get_user_organization(db, user.id)
    if not org_info:
        raise HTTPException(status_code=403, detail="No organization found")

    org, _role = org_info
    stmt = select(ScanSchedule).where(
        ScanSchedule.id == schedule_id,
        ScanSchedule.org_id == org.id,
    )
    schedule = db.execute(stmt).scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db.delete(schedule)
    db.commit()
    return {"success": True}
