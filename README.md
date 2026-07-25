# Tether

> The social world for people whose lives are organized through music.

Tether combines a Letterboxd-like cultural layer for music with real-time shared listening. Reviews, ratings, diary entries, lists, profiles, discovery, dating, messages, and memories create the persistent world; **Tether**—hearing the same song at the same second—remains its emotional and technical center.

## What is in this repository

- `demo/` — the directly usable browser product prototype. The recovered v14 interface is preserved in `demo/v14.js`; `demo/platform.js` expands it into the broader music platform.
- `backend/` — a FastAPI service for authentication, sessions, presence, reviews, diary, lists, profiles, dating discovery, memories, provider coordination, and WebSockets.
- `docs/` — product architecture, privacy boundaries, visual language, events, metrics, and release guidance.

This repository does **not** currently contain a complete deployable React Native application. The backend and interactive web prototype are real; mobile-client claims should be evaluated only when native source is committed.

## Product architecture

### Home

The living overview: current playback, friends listening, open sessions, recent music discourse, diary continuity, lists, invitations, and memories.

### Exchange

The persistent cultural layer:

- Reviews of tracks, albums, artists, concerts, playlists, and Tether sessions
- Personal ratings, including the intentional Platinum 6.0
- Private listening diary
- Public, followers-only, or private music lists
- Following and recommendation feeds
- Replies, messages, and immediate listening actions

### Tether

The center action:

- Open your listening
- Join, Knock, or invite
- Cross-provider synchronization
- Shared Stage and collaborative queue
- Pulse
- Automatic Memory Anchors and Time Capsules

### Wavelength

Relationship discovery through music:

- Friendship discovery
- Local scenes and communities
- Explicitly opt-in Dating
- Identity, orientation, intent, relationship structure, age and distance preferences
- Priority artists/albums, taste boundaries, concert habits, prompts, and song-shaped gestures
- Evidence-based explanations rather than fabricated compatibility precision

### You

A complete music identity: top artists, favorite records, diary, reviews, lists, ratings, Tether history, Memory Anchors, Time Capsules, dating controls, and privacy settings.

### What the prototype actually ships

The sections above describe the product design. The browser prototype currently
implements a deliberately narrowed version of it, and the two should not be
confused when reading this repository:

- **Primary navigation is three destinations — Listen, People, You.** The
  five-position navigation described above is a design target, not shipped code.
- Exchange and Wavelength exist as surfaces reachable from within those three
  destinations, not as their own tabs.
- Messages are contextual, living in the header and person surfaces rather than
  occupying a permanent primary destination.

`demo/tests/shell.test.mjs` asserts the three-destination shell, so this section
and the code cannot drift apart silently.

## Trust model

- Raw coordinates are reduced to short-lived coarse cells before storage.
- Discovery returns broad distance bands, never exact coordinates or phone numbers.
- Ordinary public profiles never expose dating fields.
- Dating requires explicit enablement, adult eligibility, a completed profile, and a separate visibility choice.
- Dealbreakers and matching preferences are used privately and are not shown on public profiles.
- Diary notes are owner-only.
- WebSockets use one-minute scoped tickets rather than primary access tokens in URLs.
- Session playback, Knock, Pulse, reconnect, and Memory Anchor decisions are authorized from server-side state.
- Production refuses default secrets, wildcard CORS, anonymous WebSocket access, or a database without an Alembic revision.
- Core listening, invitations, joining, and Pulse are never ad-gated.
- Telemetry rejects review text, titles, artists, diary notes, prompts, identity, orientation, relationship details, coordinates, contacts, credentials, and provider tokens.

See `docs/CURRENT_STATE.md`, `docs/DELIVER_IMPLEMENTATION.md`, `docs/MUSIC_PLATFORM.md`, `docs/EVENTS.md`, and `docs/PRODUCT_PRINCIPLES.md`.

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
cp .env.example .env
uvicorn main:app --reload
```

Development defaults are intentionally local. Production requires an explicit secret, a CORS allowlist, and an Alembic-managed database at a known revision.

## Test

```bash
cd demo
npm install
npm test

cd ../backend
SECRET_KEY=any-local-value-at-least-32-characters-long pytest -q
```

`backend/config.py` refuses to start without a `SECRET_KEY` of at least 32
characters that is not on its blocklist of known placeholder values — including
in tests, which is why the variable is set above.

GitHub Actions runs both suites, plus guardrails that fail the build if a
database file, a `.env`, or a submodule pointer without `.gitmodules` is ever
committed again.

## Product measures

The defining metric remains **Meaningful Shared Listens per Weekly Active User**. The cultural layer adds supporting measures such as diary retention, review creation, list saves, review-to-listen conversion, and the percentage of relationships that move from cultural interaction into a real Tether.

The operating promise remains the **Ten-second Tether**: from opening the product to hearing synchronized music with another person in under ten seconds.

## Status

Tether is a serious product prototype, not yet a production release. The durable audit foundation now covers trust boundaries, safety records, platform schemas, migrations, telemetry, and evidence-preserving recommendations. A complete native client, real provider authorization/playback, multi-instance coordination, production media infrastructure, migration rehearsal, moderation operations, store compliance, and real-device cross-provider testing remain required before public launch.
