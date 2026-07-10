# Customer-worship overhaul notes

This branch intentionally replaces the previous feature-showcase architecture in one concentrated change.

## Product

- Reduces primary navigation from five destinations to **Listen**, **People**, and **You**.
- Centers current playback and one-tap **Open your listening**.
- Treats the shared Stage as the flagship experience.
- Simplifies Pulse to a direct relational action.
- Folds messages into People and removes Exchange from the primary shell.
- Replaces compatibility percentages with visible evidence.
- Makes Memory Anchors automatic session outcomes.
- Keeps Time Capsules and signal exploration secondary.
- Removes follower-marketplace metrics, city trending, blanket haptics, and motion on every control.

## Trust and backend

- Removes phone numbers from discovery responses.
- Converts exact coordinates into short-lived coarse cells before persistence.
- Removes global raw-coordinate enumeration.
- Restricts CORS to an environment allowlist.
- Refuses unsafe production secrets and anonymous production WebSockets.
- Replaces primary JWTs in WebSocket URLs with short-lived scoped tickets.
- Adds rotating refresh tokens, access-token revocation, and basic authentication throttling.
- Aligns Pulse cooldown with the documented three-second behavior.
- Removes rewarded ads from invitations, joins, playback, and Pulse.

## Customer observability

- Defines Meaningful Shared Listens per Weekly Active User as the North Star.
- Adds an allowlisted, versioned event API.
- Rejects sensitive telemetry property names and non-scalar payloads.
- Adds tests for location reduction, event privacy, token scope, and ticket duration.
- Adds CI checks for JavaScript syntax, Python tests, and known unsafe patterns.

## Known limits

- Refresh-token and revocation state is currently process-local and must move to Redis or a database before multi-instance production deployment.
- Real Spotify/Apple Music matching, native haptics, push delivery, and mobile packaging still require provider credentials and device testing.
- This repository still does not contain a complete React Native client.
