"""Simple in-memory rate limiter for sensitive endpoints."""

import time
from threading import Lock
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from ..logging_config import get_logger

logger = get_logger(__name__)


class _TokenBucket:
    """Simple token bucket rate limiter per client IP + path."""

    def __init__(self, max_tokens: int = 10, refill_seconds: float = 60.0):
        self.max_tokens = max_tokens
        self.refill_seconds = refill_seconds
        self._buckets: dict[str, tuple[float, float]] = {}  # key -> (tokens, last_refill)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            if key not in self._buckets:
                self._buckets[key] = (self.max_tokens - 1, now)
                return True

            tokens, last_refill = self._buckets[key]
            elapsed = now - last_refill
            tokens = min(
                self.max_tokens,
                tokens + elapsed * (self.max_tokens / self.refill_seconds),
            )

            if tokens < 1:
                self._buckets[key] = (tokens, now)
                return False

            self._buckets[key] = (tokens - 1, now)
            return True


# Paths that should be rate-limited (credential endpoints)
RATE_LIMITED_PATHS = {
    "/api/config/jira/credentials",
    "/api/config/jira/test-connection",
}

_bucket = _TokenBucket(max_tokens=10, refill_seconds=60.0)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limit sensitive endpoints to prevent brute-force attacks."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Only rate-limit specific paths and mutating methods
        if path in RATE_LIMITED_PATHS and request.method in ("PUT", "POST"):
            client_ip = request.client.host if request.client else "unknown"
            key = f"{client_ip}:{path}"

            if not _bucket.allow(key):
                logger.warning(
                    f"Rate limit exceeded for {client_ip} on {path}",
                    extra={"client": client_ip, "path": path},
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "TooManyRequests",
                        "message": "Rate limit exceeded. Please try again later.",
                    },
                )

        return await call_next(request)
