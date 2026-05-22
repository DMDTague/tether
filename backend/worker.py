import asyncio
from sqlalchemy import select, update, delete
from datetime import datetime, timezone, timedelta
import httpx

from db.database import async_session
from models.models import TimeCapsule, User, MemoryAnchor, Sesh
from services.weather import check_if_raining
from services.push import send_push_message
from services.spotify import get_audio_features

async def check_capsules_job():
    """Background job to poll OpenWeather and unlock capsules."""
    async with async_session() as db:
        result = await db.execute(
            select(TimeCapsule, User.expo_push_token)
            .join(User, TimeCapsule.recipient_id == User.id)
            .where(TimeCapsule.is_opened == False, TimeCapsule.unlocked_notified == False)
        )
        capsules = result.all()

        for capsule, token in capsules:
            if not capsule.lock_type:
                if token:
                    send_push_message(token, f"You received a new Time Capsule from {capsule.sender_id}!")
                capsule.unlocked_notified = True
                await db.commit()
                continue

            recipient_city = "New York" 
            unlock = False
            lock_msg = "Your Time Capsule is ready."

            if capsule.lock_type == 'rain':
                is_raining = await check_if_raining(recipient_city)
                if is_raining:
                    unlock = True
                    lock_msg = "The skies have opened up. Your Time Capsule is ready."
            elif capsule.lock_type == 'auto':
                # Auto-lock based on spotify audio features
                features = await get_audio_features(capsule.track_id)
                valence = features.get('valence', 0.5)
                acousticness = features.get('acousticness', 0.5)
                danceability = features.get('danceability', 0.5)
                
                is_raining = await check_if_raining(recipient_city)
                # In a real app we'd check sunset, for now assume clear skies is just not raining
                
                if valence < 0.4 and acousticness > 0.5 and is_raining:
                    unlock = True
                    lock_msg = "The weather matches the mood. Your capsule unlocked."
                elif danceability > 0.7 and not is_raining:
                    unlock = True
                    lock_msg = "The night is clear and energetic. Your capsule unlocked."
                # Fallback: just unlock after some time if it doesn't match? For now, keep locked until condition.
                
            if unlock:
                capsule.unlocked_notified = True
                if token:
                    send_push_message(token, lock_msg)
                await db.commit()

async def decay_anchors_job():
    """Background job to decay memory anchors."""
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(select(MemoryAnchor))
        anchors = result.scalars().all()
        for a in anchors:
            # 7 days to decay to 0 = 100 / 7 per day = ~0.595 per hour
            # Let's calculate exactly based on timedelta
            delta = now - a.last_tethered_at
            days_passed = delta.total_seconds() / 86400
            new_health = max(0.0, 100.0 - (days_passed / 7.0 * 100.0))
            a.health = new_health
            if new_health == 0:
                # Optionally delete it, or keep it hidden
                pass
        await db.commit()

async def process_pending_seshs_job():
    """Background job to auto-generate Vibe Title and Caption after 1 hour of inactivity."""
    from routes.sesh import mock_ai_generation
    import json
    
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(select(Sesh).where(Sesh.status == "pending"))
        seshs = result.scalars().all()
        for s in seshs:
            publish_at = s.publish_at
            if not publish_at and s.created_at:
                publish_at = s.created_at + timedelta(hours=1)
            if not publish_at or now < publish_at:
                continue
            tracks_info = json.dumps(s.tracks)
            title, caption = mock_ai_generation(tracks_info)
            s.title = title
            s.caption = caption
            s.status = "published"
            s.published_at = now
        await db.commit()

def setup_scheduler():
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_capsules_job, 'interval', minutes=15)
    scheduler.add_job(decay_anchors_job, 'interval', minutes=60)
    scheduler.add_job(process_pending_seshs_job, 'interval', minutes=5)
    scheduler.start()
