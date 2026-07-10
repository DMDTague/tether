# Security notes

## Fixed in this branch

- Default production secrets cause startup failure.
- Production wildcard CORS is rejected.
- Anonymous WebSockets are disabled by default and forbidden in production.
- Primary access tokens are replaced by one-minute WebSocket tickets in connection URLs.
- Malformed and oversized WebSocket messages receive structured rejection.
- Login, registration, and refresh attempts have a bounded rate limit.
- Phone numbers and private spark tokens are excluded from discovery serialization.
- Raw coordinates are not persisted by the presence service.
- Ad completion is no longer trusted to unlock core access.

## Required before production

- Store refresh sessions and access revocations in Redis or a durable database.
- Add distributed rate limiting behind the public edge.
- Add secure cookie or platform-keystore handling for refresh tokens.
- Add account recovery, device/session management, and forced logout.
- Add dependency scanning, secret scanning, and container/image scanning.
- Add structured security audit logs without sensitive payload content.
- Threat-model invitation links, provider callbacks, abuse reporting, and session ownership.
