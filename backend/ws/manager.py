"""
Tether WebSocket Connection Manager

Manages all active WebSocket connections and provides
targeted and broadcast message delivery.
"""

import json
import time
import asyncio
from typing import Optional
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for real-time communication."""

    def __init__(self):
        # user_id -> WebSocket
        self._connections: dict[str, WebSocket] = {}
        # session_id -> set of user_ids
        self._sessions: dict[str, set[str]] = {}
        # user_id -> session_id
        self._user_sessions: dict[str, str] = {}
        # user_id -> city string
        self._cities: dict[str, str] = {}
        # user_id -> colors array
        self._user_colors: dict[str, list] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[user_id] = websocket

    async def disconnect(self, user_id: str):
        self._connections.pop(user_id, None)
        self._cities.pop(user_id, None)
        session_id = self._user_sessions.pop(user_id, None)
        if session_id and session_id in self._sessions:
            self._sessions[session_id].discard(user_id)
            if not self._sessions[session_id]:
                del self._sessions[session_id]
        
        # Trigger async session termination logic without blocking
        from ws.terminator import handle_disconnect
        asyncio.create_task(handle_disconnect(user_id, session_id))

    async def _broadcast_colors(self, session_id: str):
        members = self._sessions.get(session_id, set())
        active_colors = []
        for uid in members:
            colors = self._user_colors.get(uid)
            if colors:
                active_colors.append(colors)
        
        # Broadcast standard message with active colors
        msg = {
            "type": "session_colors",
            "active_colors": active_colors
        }
        await self.broadcast_to_session(session_id, msg)

    async def join_session(self, user_id: str, session_id: str):
        self._user_sessions[user_id] = session_id
        if session_id not in self._sessions:
            self._sessions[session_id] = set()
        self._sessions[session_id].add(user_id)
        await self._broadcast_colors(session_id)

    async def leave_session(self, user_id: str):
        session_id = self._user_sessions.pop(user_id, None)
        if session_id and session_id in self._sessions:
            self._sessions[session_id].discard(user_id)
            await self._broadcast_colors(session_id)

    def get_session_members(self, session_id: str) -> set[str]:
        return self._sessions.get(session_id, set())

    def get_user_session(self, user_id: str) -> Optional[str]:
        return self._user_sessions.get(user_id)

    def set_user_city(self, user_id: str, city: str):
        self._cities[user_id] = city
        
    def get_user_city(self, user_id: str) -> Optional[str]:
        return self._cities.get(user_id)

    async def send_to_user(self, user_id: str, message: dict):
        ws = self._connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(user_id)

    async def broadcast_to_session(self, session_id: str, message: dict, exclude: Optional[str] = None):
        members = self._sessions.get(session_id, set())
        for uid in list(members):
            if uid != exclude:
                await self.send_to_user(uid, message)

    async def broadcast_to_friends(self, friend_ids: list[str], message: dict):
        for uid in friend_ids:
            await self.send_to_user(uid, message)

    def is_connected(self, user_id: str) -> bool:
        return user_id in self._connections

    @property
    def active_connections(self) -> int:
        return len(self._connections)


# Singleton instance
manager = ConnectionManager()
