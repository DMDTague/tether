"""Scheduled maintenance jobs for capsules, anchors, and SESH publishing."""

import asyncio
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from db.database import async_session
from models.models import MemoryAnchor, Sesh, TimeCapsule, User
from services.presence import presence_store
from services.push import send_push_message
from services.spotify import get_audio_features
from services.weather import check_if_raining_at


async def _recipient_location_center(user_id: str) -> tuple[float, float] | None:
    """Resolve only the center of the recipient's short-lived coarse location cell."""
    location = await presence_store.get_user_location(user_id)
    if not location:
        return None
    try:
        precision = float(location["precisionDegrees"])
        lat = (int(location["latCell"]) + 0.5) * precision
        lon = (int(location["lonCell"]) + 0.5) * precision
    except (KeyError, TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    return lat, lon


async def _send_push(token: str, message: str) -> None:
    """Keep the synchronous Expo SDK off the API event loop."""
    await asyncio.to_thread(send_push_message, token, message)


async def check_capsules_job():
    """Poll environmental conditions and notify recipients when capsules unlock."""
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
                    await _send_push(
                        token,
                        f"You received a new Time Capsule from {capsule.sender_id}!",
                    )
                capsule.unlocked_notified = True
                continue

            unlock = False
            lock_msg = "Your Time Capsule is ready."

            # Rain/auto locks are evaluated from the same short-lived coarse
            # location cells used by presence. Never substitute a hard-coded
            # city: that can unlock a recipient's capsule in the wrong weather.
            if capsule.lock_type in {"rain", "auto"}:
                location = await _recipient_location_center(capsule.recipient_id)
                if not location:
                    continue
                lat, lon = location
                is_raining = await check_if_raining_at(lat, lon)

                if capsule.lock_type == "rain":
                    if is_raining:
                        unlock = True
                        lock_msg = "The skies have opened up. Your Time Capsule is ready."
                else:
                    if not capsule.track_id:
                        continue
                    features = await get_audio_features(capsule.track_id)
                    valence = features.get("valence", 0.5)
                    acousticness = features.get("acousticness", 0.5)
                    danceability = features.get("danceability", 0.5)

                    if valence < 0.4 and acousticness > 0.5 and is_raining:
                        unlock = True
                        lock_msg = "The weather matches the mood. Your capsule unlocked."
                    elif danceability > 0.7 and not is_raining:
                        unlock = True
                        lock_msg = "The night is clear and energetic. Your capsule unlocked."

            if unlock:
                if token:
                    await _send_push(token, lock_msg)
                capsule.unlocked_notified = True

        await db.commit()


async def decay_anchors_job():
    """Decay memory-anchor health over seven days since the last tether."""
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(select(MemoryAnchor))
        anchors = result.scalars().all()
        for anchor in anchors:
            delta = now - anchor.last_tethered_at
            days_passed = delta.total_seconds() / 86400
            anchor.health = max(0.0, 100.0 - (days_passed / 7.0 * 100.0))
        await db.commit()


async def process_pending_seshs_job():
    """Generate a Vibe title and caption after one hour of inactivity."""
    from routes.sesh import mock_ai_generation

    async with async_session() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(select(Sesh).where(Sesh.status == "pending"))
        seshs = result.scalars().all()
        for sesh in seshs:
            publish_at = sesh.publish_at
            if not publish_at and sesh.created_at:
                publish_at = sesh.created_at + timedelta(hours=1)
            if not publish_at or now < publish_at:
                continue
            tracks_info = json.dumps(sesh.tracks)
            title, caption = mock_ai_generation(tracks_info)
            sesh.title = title
            sesh.caption = caption
            sesh.status = "published"
            sesh.published_at = now
        await db.commit()


def setup_scheduler():
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_capsules_job, "interval", minutes=15)
    scheduler.add_job(decay_anchors_job, "interval", minutes=60)
    scheduler.add_job(process_pending_seshs_job, "interval", minutes=5)
    scheduler.start()
    return scheduler
