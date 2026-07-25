"""Multi-connection-safe WebSocket manager for one application instance."""

import asyncio
import uuid
from typing import Optional

from fastapi import WebSocket

HOST_DISCONNECT_GRACE_SECONDS = 5


class ConnectionManager:
    """Track connections by unique connection ID, never by account alone."""

    def __init__(self):
        # user_id -> connection_id -> WebSocket
        self._connections: dict[str, dict[str, WebSocket]] = {}
        # session_id -> set of user_ids
        self._sessions: dict[str, set[str]] = {}
        # user_id -> session_id
        self._user_sessions: dict[str, str] = {}
        self._cities: dict[str, str] = {}
        self._user_colors: dict[str, list] = {}
        self._disconnect_tasks: dict[str, asyncio.Task] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> str:
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self._connections.setdefault(user_id, {})[connection_id] = websocket
        pending = self._disconnect_tasks.pop(user_id, None)
        if pending:
            pending.cancel()
        return connection_id

    async def disconnect(self, user_id: str, connection_id: str):
        account_connections = self._connections.get(user_id)
        if not account_connections:
            return
        account_connections.pop(connection_id, None)
        if account_connections:
            return
        self._connections.pop(user_id, None)

        # A transient network handoff must not end a session. Finalize only if no
        # replacement connection appears during the grace period.
        previous = self._disconnect_tasks.pop(user_id, None)
        if previous:
            previous.cancel()
        self._disconnect_tasks[user_id] = asyncio.create_task(
            self._finalize_disconnected_user(user_id)
        )

    async def _finalize_disconnected_user(self, user_id: str):
        try:
            await asyncio.sleep(HOST_DISCONNECT_GRACE_SECONDS)
            if self.is_connected(user_id):
                return
            self._cities.pop(user_id, None)
            session_id = self._user_sessions.pop(user_id, None)
            if session_id and session_id in self._sessions:
                self._sessions[session_id].discard(user_id)
                if not self._sessions[session_id]:
                    del self._sessions[session_id]
            from ws.terminator import handle_disconnect

            await handle_disconnect(user_id, session_id)
        finally:
            current = self._disconnect_tasks.get(user_id)
            if current is asyncio.current_task():
                self._disconnect_tasks.pop(user_id, None)

    async def _broadcast_colors(self, session_id: str):
        active_colors = [
            self._user_colors[uid]
            for uid in self._sessions.get(session_id, set())
            if self._user_colors.get(uid)
        ]
        await self.broadcast_to_session(
            session_id,
            {"type": "session_colors", "active_colors": active_colors},
        )

    async def join_session(self, user_id: str, session_id: str):
        previous_session = self._user_sessions.get(user_id)
        if previous_session and previous_session != session_id:
            await self.leave_session(user_id)
        self._user_sessions[user_id] = session_id
        self._sessions.setdefault(session_id, set()).add(user_id)
        await self._broadcast_colors(session_id)

    async def leave_session(self, user_id: str):
        session_id = self._user_sessions.pop(user_id, None)
        if session_id and session_id in self._sessions:
            self._sessions[session_id].discard(user_id)
            if not self._sessions[session_id]:
                self._sessions.pop(session_id, None)
            else:
                await self._broadcast_colors(session_id)

    def get_session_members(self, session_id: str) -> set[str]:
        return set(self._sessions.get(session_id, set()))

    def get_user_session(self, user_id: str) -> Optional[str]:
        return self._user_sessions.get(user_id)

    def set_user_city(self, user_id: str, city: str):
        self._cities[user_id] = city

    def get_user_city(self, user_id: str) -> Optional[str]:
        return self._cities.get(user_id)

    async def _drop_failed_connection(self, user_id: str, connection_id: str):
        await self.disconnect(user_id, connection_id)

    async def send_to_user(self, user_id: str, message: dict):
        connections = list(self._connections.get(user_id, {}).items())
        for connection_id, websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                await self._drop_failed_connection(user_id, connection_id)

    async def broadcast_to_session(
        self,
        session_id: str,
        message: dict,
        exclude: Optional[str] = None,
    ):
        for user_id in list(self._sessions.get(session_id, set())):
            if user_id != exclude:
                await self.send_to_user(user_id, message)

    async def broadcast_to_friends(self, friend_ids: list[str], message: dict):
        for user_id in friend_ids:
            await self.send_to_user(user_id, message)

    def is_connected(self, user_id: str) -> bool:
        return bool(self._connections.get(user_id))

    @property
    def active_connections(self) -> int:
        return sum(len(connections) for connections in self._connections.values())


manager = ConnectionManager()
