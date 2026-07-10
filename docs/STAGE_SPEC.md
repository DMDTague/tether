# Shared Stage specification

The Stage is Tether's flagship surface.

## Required hierarchy

1. Who is present.
2. What is playing.
3. Whether playback is synchronized.
4. Pulse.
5. Invite and collaborative queue.
6. End or minimize session.

## Pulse

A tap sends a normal Pulse. A deliberate 800 ms hold may send an amplified Pulse. Server-side cooldown prevents spam without making ordinary presence feel laborious.

## Reliability

The Stage should display understandable synchronization state and recover quietly when possible. Provider mismatch, reconnection, and unavailable-track states need specific recovery actions rather than generic failure.

## Completion

A meaningful session creates a Memory Anchor automatically. Mood or a short note is optional and requested after value has already been delivered.
