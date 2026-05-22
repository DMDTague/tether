"""
Tether WebSocket Message Handlers

Routes incoming WebSocket messages to the appropriate handler.
"""

import time
import uuid
from ws.manager import manager
from ws import protocol
from services.presence import presence_store


async def handle_message(user_id: str, user_name: str, user_initials: str, data: dict):
    """Route an incoming WebSocket message to the correct handler."""
    msg_type = data.get("type")

    if msg_type == "playback_event":
        await handle_playback_event(user_id, user_name, data)
    elif msg_type == "pulse":
        await handle_pulse(user_id, user_name, data)
    elif msg_type == "knock":
        await handle_knock(user_id, user_name, user_initials, data)
    elif msg_type == "knock_response":
        await handle_knock_response(user_id, data)
    elif msg_type == "presence_update":
        await handle_presence_update(user_id, data)
    elif msg_type == "reconnect":
        await handle_reconnect(user_id, data)


async def handle_playback_event(user_id: str, user_name: str, data: dict):
    """Handle skip/pause/resume events from the host."""
    event = data.get("event")
    session_id = manager.get_user_session(user_id)
    if not session_id:
        return

    if event == "pause":
        await manager.broadcast_to_session(
            session_id,
            protocol.host_paused(session_id),
            exclude=user_id,
        )
    elif event == "resume":
        position_ms = data.get("position_ms", 0)
        await manager.broadcast_to_session(
            session_id,
            protocol.host_resumed(session_id, position_ms),
            exclude=user_id,
        )
    elif event == "skip":
        track_id = data.get("track_id", "")
        position_ms = data.get("position_ms", 0)
        await manager.broadcast_to_session(
            session_id,
            protocol.session_sync(track_id, position_ms, False),
            exclude=user_id,
        )


async def handle_pulse(user_id: str, user_name: str, data: dict):
    """Broadcast a pulse to all session members."""
    session_id = data.get("session_id")
    if not session_id:
        return

    is_cooldown = await presence_store.check_pulse_cooldown(session_id, user_id)
    if is_cooldown:
        return  # Drop the message silently

    await manager.broadcast_to_session(
        session_id,
        protocol.pulse_received(user_name),
        exclude=user_id,
    )


async def handle_knock(user_id: str, user_name: str, user_initials: str, data: dict):
    """Send a knock request to the target user."""
    target_id = data.get("target_user_id")
    if not target_id:
        return

    knock_id = str(uuid.uuid4())
    await manager.send_to_user(
        target_id,
        protocol.knock_request(user_id, user_name, user_initials, knock_id),
    )


async def handle_knock_response(user_id: str, data: dict):
    """Handle acceptance/rejection of a knock."""
    knock_id = data.get("knock_id")
    accepted = data.get("accepted", False)

    if accepted:
        # The knocking user will receive a session_sync message
        # when they join via the REST endpoint
        pass


async def handle_presence_update(user_id: str, data: dict):
    """Update the user's privacy mode and broadcast to friends."""
    privacy_mode = data.get("privacy_mode", "knock-first")
    # In production, this would update Redis and broadcast to friends
    # For now, we just acknowledge
    pass


async def handle_reconnect(user_id: str, data: dict):
    """Handle reconnection — send back current session state."""
    last_session_id = data.get("last_session_id")
    last_position = data.get("last_known_position_ms", 0)

    if last_session_id:
        members = manager.get_session_members(last_session_id)
        if members:
            # Re-join the session
            await manager.join_session(user_id, last_session_id)

            # Calculate current position from local clock
            # In production, this uses track_start_epoch from the session record
            current_position = last_position  # placeholder

            await manager.send_to_user(
                user_id,
                protocol.reconnect_ack(
                    session_id=last_session_id,
                    position_ms=current_position,
                    listeners=[],  # Would be populated from DB
                    is_paused=False,
                ),
            )
