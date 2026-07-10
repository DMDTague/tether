# Tether

> The fastest, most intimate way to share the exact moment you are hearing.

Tether is a shared-listening product prototype and backend for real-time musical presence. It is centered on one loop: notice someone listening, enter the same moment, communicate presence through Pulse, and preserve the relationship afterward as a Memory Anchor.

## What is in this repository

- `demo/` — the directly usable, responsive browser product prototype.
- `backend/` — a FastAPI service for authentication, sessions, presence, discovery, memories, provider coordination, and WebSockets.
- `docs/` — product principles and the privacy-safe event contract.

This repository does **not** currently contain a complete deployable React Native application. Earlier documentation overstated that status. The backend and interactive web prototype are real; mobile-client work should be evaluated only when its source is committed.

## Product structure

The prototype has three primary destinations:

- **Listen** — current playback, one-tap “Open your listening,” available people, and relationship continuations.
- **People** — close connections, live availability, contextual conversations, and optional evidence-based exploration.
- **You** — music identity, Open Door / Knock First / Ghost, Memory Anchors, Time Capsules, and data controls.

The shared Stage is the flagship surface. Pulse is a tap for a normal signal and an 800 ms hold for an amplified one. Sessions create Memory Anchors automatically.

## Trust model

- Raw coordinates are reduced to short-lived coarse cells before storage.
- Discovery returns broad distance bands, never exact coordinates or phone numbers.
- Discovery explains shared artists, availability, and listening patterns instead of inventing percentage precision.
- WebSockets use one-minute scoped tickets rather than primary access tokens in URLs.
- Production refuses default secrets, wildcard CORS, or anonymous WebSocket access.
- Access tokens are short-lived; refresh tokens rotate and can be revoked.
- Core listening, invitations, joining, and Pulse are never ad-gated.
- Telemetry uses a typed allowlist and rejects message text, search text, coordinates, contact details, credentials, and provider tokens.

See [`docs/EVENTS.md`](docs/EVENTS.md) and [`docs/PRODUCT_PRINCIPLES.md`](docs/PRODUCT_PRINCIPLES.md).

## Run the browser prototype

The demo uses static files and does not require a build step.

```bash
python -m http.server 4173 --directory demo
```

Then open `http://localhost:4173`.

## Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # when available, then set a real SECRET_KEY
uvicorn main:app --reload
```

Development defaults are intentionally local. Production requires an explicit secret and CORS allowlist.

## Test

```bash
node --check demo/app.js
cd backend
pytest -q
```

GitHub Actions compiles the backend, runs the test suite, checks the demo JavaScript, and rejects several known unsafe patterns.

## Product metric

The North Star is **Meaningful Shared Listens per Weekly Active User**: two real users remain synchronized for at least five minutes, perform a relational action, and do not immediately use a safety action.

The operating promise is the **Ten-second Tether**: from opening the product to hearing synchronized music with another person in under ten seconds.

## Status

Tether is a serious product prototype, not yet a production release. Provider credentials, deployment monitoring, database migrations, mobile packaging, store compliance, abuse operations, and real-device cross-provider testing still need to be completed before public launch.
