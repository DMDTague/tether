# Tether privacy model

Tether combines listening behavior, relationships, availability, and optional discovery. Those signals become sensitive when joined together, so the system uses separation, minimization, and short retention by default.

## Presence

Open Door, Knock First, and Ghost are authorization states, not decorative labels. Presence reads must continue to pass through relationship and privacy checks.

## Location

The location endpoint accepts coordinates only long enough to reduce them to a coarse cell. Presence storage retains the cell for fifteen minutes and returns only broad distance bands. Discovery code cannot enumerate a global map of raw coordinates.

## Discovery

Discovery responses may contain public profile data, top artists, broad distance bands, current public presence, and match evidence. They must never contain phone numbers, provider tokens, precise coordinates, or private matching inputs.

## Telemetry

Telemetry is allowlisted and versioned. It measures attempts, reliability, duration thresholds, and relational actions. The ingestion schema rejects property names associated with messages, search input, coordinates, contact details, credentials, and provider tokens.

## Session replay

Replay is not enabled by this branch. Any future replay implementation must be sampled, opt-controlled, and exclude chats, identity, artwork where listening is private, location controls, dating fields, authentication, provider credentials, and safety forms.

## Authentication

Access tokens are short-lived. Refresh tokens rotate. WebSocket clients exchange an authenticated access token for a one-minute ticket so primary credentials do not appear in connection URLs. Multi-instance deployment requires moving revocation and refresh state from process memory to shared storage.
