# Tether architecture after the customer-worship overhaul

## Product surfaces

The committed client surface is the static browser prototype in `demo/`. It has three primary destinations—Listen, People, and You—and a full-screen shared Stage. The backend remains a FastAPI service.

## Core request flow

1. The client detects current playback.
2. The user opens listening with saved privacy defaults.
3. The API creates or joins a session and resolves provider matching.
4. The client obtains a short-lived WebSocket ticket from `/api/auth/ws-ticket`.
5. Real-time playback, presence, Pulse, queue, knock, and reconnect messages travel over the authenticated socket.
6. Server-authoritative telemetry records join, sync, duration, and delivery outcomes.
7. A meaningful session creates a Memory Anchor.

## Trust boundaries

- Environment settings validate production secrets, CORS, and anonymous socket behavior at startup.
- Primary access tokens are not accepted in WebSocket URLs.
- Location is reduced to a coarse cell before persistence.
- Discovery returns evidence and broad bands rather than raw location or contact data.
- Telemetry has an explicit allowlist and rejects sensitive property names.
- Rewarded ads cannot gate core listening.

## Deployment gap

The current refresh-token and access-revocation registries are process-local. They demonstrate rotation and revocation semantics but must move to Redis or a durable database before horizontal deployment. The repository also needs a committed mobile client, migrations, provider credentials, monitoring, and real-device end-to-end tests before a production claim is appropriate.
