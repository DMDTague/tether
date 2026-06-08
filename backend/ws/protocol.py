"""
Tether WebSocket Protocol

Defines all message types and the reconnect handshake.
"""

from enum import Enum
from pydantic import BaseModel
from typing import Optional


# ── Client → Server Messages ─────────────────────────────────

class PlaybackEvent(BaseModel):
    type: str = "playback_event"
    event: str  # skip | pause | resume
    track_id: Optional[str] = None
    position_ms: Optional[int] = None

class PulseMessage(BaseModel):
    type: str = "pulse"
    session_id: str

class KnockMessage(BaseModel):
    type: str = "knock"
    target_user_id: str

class KnockResponse(BaseModel):
    type: str = "knock_response"
    knock_id: str
    accepted: bool

class PresenceUpdate(BaseModel):
    type: str = "presence_update"
    privacy_mode: str

class ReconnectMessage(BaseModel):
    type: str = "reconnect"
    user_id: str
    last_session_id: Optional[str] = None
    last_known_position_ms: Optional[int] = None


# ── Server → Client Messages ─────────────────────────────────

def session_sync(track_id: str, position_ms: int, is_paused: bool) -> dict:
    return {"type": "session_sync", "trackId": track_id, "positionMs": position_ms, "isPaused": is_paused}

def listener_joined(user_id: str, name: str, initials: str) -> dict:
    return {"type": "listener_joined", "user": {"id": user_id, "name": name, "initials": initials}}

def listener_left(user_id: str) -> dict:
    return {"type": "listener_left", "userId": user_id}

def pulse_received(name: str) -> dict:
    return {"type": "pulse_received", "fromUser": {"name": name}}

def knock_request(knocker_id: str, knocker_name: str, knocker_initials: str, knock_id: str, session_id: str) -> dict:
    return {
        "type": "knock_request",
        "fromUser": {"id": knocker_id, "name": knocker_name, "initials": knocker_initials},
        "knockId": knock_id,
        "sessionId": session_id,
    }

def friend_presence(user_id: str, status: str, track: str = "", artist: str = "", provider: str = "spotify") -> dict:
    return {"type": "friend_presence", "userId": user_id, "status": status, "track": track, "artist": artist, "provider": provider}

def host_paused(session_id: str) -> dict:
    return {"type": "host_paused", "sessionId": session_id}

def host_resumed(session_id: str, position_ms: int) -> dict:
    return {"type": "host_resumed", "sessionId": session_id, "positionMs": position_ms}

def transparent_presence(name: str, initials: str) -> dict:
    return {"type": "transparent_presence", "user": {"name": name, "initials": initials}}

def reconnect_ack(session_id: str, position_ms: int, listeners: list, is_paused: bool) -> dict:
    return {"type": "reconnect_ack", "sessionId": session_id, "positionMs": position_ms, "listeners": listeners, "isPaused": is_paused}
