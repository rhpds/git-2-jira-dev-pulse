"""CSRF protection middleware via Origin/Referer header validation."""

from urllib.parse import urlparse

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from ..logging_config import get_logger

logger = get_logger(__name__)

# Origins that are allowed to make state-changing requests
ALLOWED_ORIGINS = {
    "localhost",
    "127.0.0.1",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """Validate Origin/Referer headers on non-GET/HEAD/OPTIONS requests
    to prevent cross-site request forgery."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        # Only check state-changing methods
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)

        origin = request.headers.get("origin")
        referer = request.headers.get("referer")

        # If neither header is present, allow (same-origin requests
        # from non-browser clients like curl or the MCP server)
        if not origin and not referer:
            return await call_next(request)

        # Check Origin header first
        if origin:
            parsed = urlparse(origin)
            hostname = parsed.hostname or ""
            if hostname not in ALLOWED_ORIGINS:
                logger.warning(
                    f"CSRF check failed: origin '{origin}' not allowed",
                    extra={"path": request.url.path, "origin": origin},
                )
                return JSONResponse(
                    status_code=403,
                    content={"error": "Forbidden", "message": "Origin not allowed"},
                )
            return await call_next(request)

        # Fallback: check Referer header
        if referer:
            parsed = urlparse(referer)
            hostname = parsed.hostname or ""
            if hostname not in ALLOWED_ORIGINS:
                logger.warning(
                    f"CSRF check failed: referer '{referer}' not allowed",
                    extra={"path": request.url.path, "referer": referer},
                )
                return JSONResponse(
                    status_code=403,
                    content={"error": "Forbidden", "message": "Referer not allowed"},
                )

        return await call_next(request)
