# Tether current state

This is the canonical source-status document for the repository. Product doctrine describes the world Tether is building; this file describes what the repository can prove today.

## Product center

Tether is a relationship network whose fundamental unit is a shared musical moment. The operating loop is:

**Listen → Express → Discover → Connect → Tether → Remember → Return**

The North Star remains **Meaningful Shared Listens per Weekly Active User**. A meaningful shared listen has one authoritative contract: two real accounts remain synchronized for at least five minutes, at least one relational action occurs, and the session has no immediate safety rejection.

## Implemented in the audit-foundation branch

- Account-scoped blocks, mutes, user reports, content reports, moderation cases, and moderation actions.
- Participant-scoped friendship mutations and separate friendship/mute state.
- Database-authorized WebSocket playback, Pulse, Knock, reconnect, and Tether-success handling.
- Durable Knock records and provider-neutral session creation for Spotify and Apple Music.
- Authoritative five-minute Memory Anchor creation without fabricated distance totals.
- Durable public profiles, field-level visibility, media references, private albums, communities, Dating profiles/preferences/swipes/signals/matches, Exchange posts/reviews/comments/lists/diary, messages, listen events, Taste Graph aggregates, recommendation exposures/outcomes, and product telemetry.
- Reciprocal Dating eligibility and mutual-match requirements before match state exists.
- Explainable recommendations that identify evidence provenance and say when no observed listen exists.
- Exchange ranking that values listening, Tethers, replies, and saves more than passive reactions.
- Production startup requires an Alembic-managed schema; development may still create tables automatically.

## Still required before public launch

- A committed, deployable React Native client. No complete native client is currently present.
- Real Spotify and Apple Music authorization, playback-control, background-mode, and device testing.
- Redis-backed multi-instance session coordination, pub/sub, distributed rate limits, and durable refresh-token state.
- Production object storage and media processing.
- Human moderation operations, appeals, service-level objectives, and abuse-response staffing.
- Full migration rehearsal against a production-like PostgreSQL snapshot.
- Real-device cross-provider drift testing and failure recovery.
- App Store / Play Store compliance, privacy review, accessibility testing, and release operations.
- Ranking-model evaluation using real outcomes; the first Taste Graph is an evidence-preserving foundation, not a mature ML system.

## Claims policy

Customer-facing and executive documents must distinguish:

- **Implemented:** code and durable storage exist and are tested.
- **Prototype:** an interactive simulation exists, but production infrastructure or real provider integration does not.
- **Designed:** doctrine/schema/API contracts exist, but the complete customer journey is not shipped.

Synthetic demo people and content must be labeled as demo data. Unobserved recommendations must never be presented as known taste. Exact location, fabricated distance, invented compatibility percentages, and fake engagement totals are prohibited.
