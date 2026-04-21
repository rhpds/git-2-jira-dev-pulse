"""Path validation to prevent traversal attacks on git/folder endpoints."""
from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException

from ..config import settings


def validate_repo_path(path: str) -> Path:
    """Validate that a path is within allowed scan directories."""
    resolved = Path(path).expanduser().resolve()
    allowed_roots = [
        Path(p.strip()).expanduser().resolve()
        for p in settings.allowed_scan_paths.split(",")
        if p.strip()
    ]
    for root in allowed_roots:
        try:
            resolved.relative_to(root)
            if not resolved.is_dir():
                raise HTTPException(status_code=400, detail="Path is not a directory")
            return resolved
        except ValueError:
            continue
    raise HTTPException(
        status_code=403,
        detail="Path is outside allowed scan directories",
    )
