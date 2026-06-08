import logging
from datetime import datetime, timezone
from sqlalchemy import select
from db.database import async_session
from models.models import Session, MemoryAnchor, SessionListener
from ws.manager import manager

logger = logging.getLogger(__name__)

async def handle_disconnect(user_id: str, session_id: str | None):
    """
    Called when a user disconnects. If they were the host of a session,
    terminate it and create Memory Anchors if it was meaningful.
    """
    if not session_id:
        return

    try:
        async with async_session() as db:
            result = await db.execute(select(Session).where(Session.id == session_id))
            session = result.scalar_one_or_none()

            if not session or session.host_id != user_id:
                return # Not the host, or session doesn't exist

            # Calculate duration
            duration_delta = datetime.now(timezone.utc) - session.created_at
            duration_minutes = int(duration_delta.total_seconds() / 60)

            # Check if meaningful
            listener_result = await db.execute(
                select(SessionListener).where(
                    SessionListener.session_id == session_id,
                    SessionListener.has_tethered == True
                )
            )
            listeners = listener_result.scalars().all()

            if duration_minutes >= 2 and len(listeners) > 0:
                # In a real app we'd fetch pulse count from Redis here. 
                # For now we'll use a placeholder or check presence store
                pulse_count = 0 
                
                # Fetch cities (Distance Layer).
                host_city = manager.get_user_city(user_id) or "Unknown City"
                
                for listener in listeners:
                    listener_city = manager.get_user_city(listener.user_id) or "Unknown City"
                    city_a = host_city
                    city_b = listener_city
                    
                    if host_city == listener_city:
                        city_a_val = "Same city"
                        city_b_val = None
                    else:
                        city_a_val = host_city
                        city_b_val = listener_city

                    # Create for Host
                    anchor_host = MemoryAnchor(
                        user_id=session.host_id,
                        friend_id=listener.user_id,
                        track_name=session.track_name,
                        artist_name=session.artist_name,
                        duration_minutes=duration_minutes,
                        pulse_count=pulse_count,
                        city_a=city_a_val,
                        city_b=city_b_val,
                        session_date=session.created_at
                    )
                    db.add(anchor_host)
                    
                    # Create for Listener
                    anchor_listener = MemoryAnchor(
                        user_id=listener.user_id,
                        friend_id=session.host_id,
                        track_name=session.track_name,
                        artist_name=session.artist_name,
                        duration_minutes=duration_minutes,
                        pulse_count=pulse_count,
                        city_a=city_a_val,
                        city_b=city_b_val,
                        session_date=session.created_at
                    )
                    db.add(anchor_listener)
                
                await db.commit()
                logger.info(f"Created {len(listeners) * 2} Memory Anchors for session {session_id}")
                
                # Notify Host
                await manager.send_to_user(session.host_id, {"type": "memory_created", "session_id": session_id})
                
                # Notify Listeners
                for listener in listeners:
                    await manager.send_to_user(listener.user_id, {"type": "memory_created", "session_id": session_id})
            else:
                # Notify failed save if duration < 2 mins or no verified listeners
                await manager.send_to_user(session.host_id, {"type": "memory_failed", "session_id": session_id})
            
            # Delete session
            await db.delete(session)
            await db.commit()

    except Exception as e:
        logger.error(f"Error terminating session: {str(e)}")
