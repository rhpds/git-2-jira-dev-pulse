"""Rate limiting middleware using token bucket algorithm."""
from __future__ import annotations

import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from ..logging_config import get_logger

logger = get_logger(__name__)


class TokenBucket:
    """Token bucket rate limiter per key."""

    def __init__(self, rate: float, capacity: int):
        self.rate = rate  # tokens per second
        self.capacity = capacity
        self._buckets: dict[str, tuple[float, float]] = {}  # key -> (tokens, last_check)

    def consume(self, key: str) -> tuple[bool, int, int, float]:
        """Try to consume a token. Returns (allowed, remaining, limit, reset_seconds)."""
        now = time.time()

        if key in self._buckets:
            tokens, last_check = self._buckets[key]
            elapsed = now - last_check
            tokens = min(self.capacity, tokens + elapsed * self.rate)
        else:
            tokens = float(self.capacity)
            last_check = now

        if tokens >= 1:
            tokens -= 1
            self._buckets[key] = (tokens, now)
            return True, int(tokens), self.capacity, 0
        else:
            self._buckets[key] = (tokens, now)
            reset_time = (1 - tokens) / self.rate
            return False, 0, self.capacity, reset_time

    def cleanup(self, max_age: float = 3600):
        """Remove stale entries older than max_age seconds."""
        now = time.time()
        stale_keys = [
            key for key, (_, last_check) in self._buckets.items()
            if now - last_check > max_age
        ]
        for key in stale_keys:
            del self._buckets[key]


# Global rate limiters
_default_limiter = TokenBucket(rate=2.0, capacity=120)  # 120 requests, refills at 2/sec
_auth_limiter = TokenBucket(rate=0.2, capacity=10)  # 10 attempts, refills at 1 per 5 sec

# Paths that should NOT be rate limited
EXEMPT_PATHS = {"/api/health", "/docs", "/openapi.json"}

# Paths with stricter rate limits
AUTH_PATHS = {"/api/auth/login", "/api/auth/register", "/api/oauth/github/callback"}


def _get_client_key(request: Request) -> str:
    """Get a rate limit key for the request (IP + user if authenticated)."""
    # Use X-Forwarded-For for proxied requests, fall back to client host
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

    # If authenticated, include user ID for per-user limiting
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        # Use a hash of the token to identify the user without decoding
        token_prefix = auth[7:17]  # First 10 chars of token
        return f"user:{token_prefix}:{ip}"

    return f"ip:{ip}"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware for the API."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip exempt paths
        if path in EXEMPT_PATHS:
            return await call_next(request)

        # Skip non-API paths
        if not path.startswith("/api/"):
            return await call_next(request)

        client_key = _get_client_key(request)

        # Use stricter limiter for auth endpoints
        if path in AUTH_PATHS:
            allowed, remaining, limit, reset = _auth_limiter.consume(f"auth:{client_key}")
        else:
            allowed, remaining, limit, reset = _default_limiter.consume(client_key)

        if not allowed:
            logger.warning(f"Rate limit exceeded for {client_key} on {path}")
            response = Response(
                content='{"detail":"Too many requests. Please try again later."}',
                status_code=429,
                media_type="application/json",
            )
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = "0"
            response.headers["X-RateLimit-Reset"] = str(int(reset))
            response.headers["Retry-After"] = str(int(reset) + 1)
            return response

        response = await call_next(request)

        # Add rate limit headers to all API responses
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response
