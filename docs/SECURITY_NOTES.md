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
- Friendship accept, sever, mute, and transparent-presence mutations require a participant; only the pending recipient can accept.
- Memory Anchor re-Tether requires an authenticated Anchor participant.
- Billboard cache refresh is authenticated, POST-only, and rate-limited; GET cannot bypass the cache.
- Sesh history requires authentication, applies blocks, and hides Ghost accounts from other viewers.
- The avatar parsing stack is pinned to patched Pillow and multipart releases. The unused Passlib dependency was removed and Billboard is reproducibly pinned.

## Dependency audit

`pip-audit` reports one known advisory: `ecdsa==0.19.2` (`PYSEC-2026-1325`) has no fixed release and is pulled by `python-jose`. Tether signs tokens with HS256, so the vulnerable ECDSA signing path is not used. Replacing `python-jose` remains preferable to carrying an unactionable transitive advisory.

## Required before production

- Store refresh sessions and access revocations in Redis or a durable database.
- Add distributed rate limiting behind the public edge.
- Add secure cookie or platform-keystore handling for refresh tokens.
- Add account recovery, device/session management, and forced logout.
- Add dependency scanning, secret scanning, and container/image scanning.
- Add structured security audit logs without sensitive payload content.
- Threat-model invitation links, provider callbacks, abuse reporting, and session ownership.
