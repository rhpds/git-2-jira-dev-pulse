"""WebSocket endpoint for real-time notifications.

Provides live updates for repo discovery, scan progress, and system events.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from ..logging_config import get_logger
from ..services.auth_service import decode_token

router = APIRouter(tags=["websocket"])
logger = get_logger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send message to all connected clients."""
        payload = json.dumps(message)
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.add(connection)
        for conn in disconnected:
            self.active_connections.discard(conn)

    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send message to a specific client."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            self.active_connections.discard(websocket)


manager = ConnectionManager()


def get_ws_manager() -> ConnectionManager:
    """Get the global WebSocket connection manager."""
    return manager


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications.

    Message types:
    - repo_discovered: New repository detected
    - scan_progress: Scan progress update
    - scan_complete: Scan finished
    - system: System notification
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token type")
            return
    except (JWTError, KeyError, ValueError):
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await manager.connect(websocket)
    try:
        await manager.send_personal(websocket, {
            "type": "system",
            "message": "Connected to real-time notifications",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await manager.send_personal(websocket, {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
            except asyncio.TimeoutError:
                try:
                    await manager.send_personal(websocket, {
                        "type": "heartbeat",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)
