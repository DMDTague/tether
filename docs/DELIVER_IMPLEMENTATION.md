# Deliver audit implementation map

This map translates `TetherDeliver.txt` into repository work. It prevents visible feature work from outrunning trust, durability, and epistemic honesty.

## Phase 0 — Trust emergency

| Audit requirement | Repository response |
|---|---|
| Ownership and membership authorization | Friendship, session, Anchor, WebSocket, Knock, Pulse, and recommendation-outcome mutations verify the authenticated account and resource relationship. |
| Replace phone-number blocking | `user_blocks` stores account IDs. The migration performs a best-effort conversion from legacy phone blocks. |
| Durable report/block system | User reports, content reports, moderation cases/actions, blocks, and mutes share one safety layer. |
| One meaningful-session rule | Five minutes + synchronized playback + relational action + no session-scoped safety report. |
| Remove fabricated metrics | Anchor recap reports observed sessions, pulses, relationship count, and provenance; fabricated distance is removed. |
| Canonical current-state document | `docs/CURRENT_STATE.md`. |
| Production migration discipline | Production refuses implicit `create_all`; Alembic revision `9f4a1d2c7b10` creates the foundation. |

Credential rotation and history purging remain an operator action described in `SECURITY_INCIDENT.md`; code cannot rotate a human password or remove already-forked Git objects.

## Phase 1 — Real Tether chassis

Backend contracts now support provider-neutral sessions, canonical track identity, provider accounts, persistent session events, sync measurements, reconnect state, and durable product telemetry. A production React Native client, distributed Redis coordination, provider credentials, and real-device tests remain open.

## Phase 2 — Complete profiles

Durable public profiles, field-level visibility, media assets, profile media, private albums/grants, communities/memberships, and profile stickers are modeled. Media upload/processing and complete client editing journeys remain open.

## Phase 3 — Dating

Dating requires explicit enablement, visibility, age 18+, a completed profile, and at least two media references. Discovery applies reciprocal eligibility; swipes and song signals are durable; matches require mutual positive decisions; unmatch is durable. Client onboarding, verification operations, private-album UX, and moderation staffing remain open.

## Phase 4 — Exchange

Posts, reviews, discussions, comments, reactions, votes, saves, lists, diary entries, feed impressions, and review-usefulness/agreement are durable. Feeds expose ranking explanations and weight meaningful outcomes. Every cultural object exposes Listen, Send, or Tether actions. Community moderation and large-scale candidate generation remain open.

## Phase 5 — Taste Graph

Normalized listen events feed user-track and user-artist aggregates. Recommendation exposures and outcomes are durable. Unheard recommendations carry `noObservedListen`, confidence, provenance, and explanations. Provider-history imports, embeddings, collaborative models, experimentation, and offline evaluation remain open.

## Phase 6 — Scale and monetization

Not started. Safety, discovery knowledge, filters, core listening, invitations, joining, and human access remain outside monetization gates by doctrine.

## Release gate

The repository may be called a **serious product prototype**. It must not be called production-ready until every open item in `docs/CURRENT_STATE.md` is resolved with evidence.
