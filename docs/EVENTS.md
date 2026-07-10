# Tether product event contract

Tether observes friction and delivered value, not private content. The server is authoritative for joins, duration, synchronization, and delivery. The client records intent, impressions, and perceived errors.

## North Star

**Meaningful Shared Listens per Weekly Active User**

A shared listen is meaningful when at least two real users remain synchronized for five minutes, one relational action occurs, and neither person immediately blocks, mutes, or reports the other.

## Privacy rules

Never include message bodies, search text, exact coordinates, contact details, names, handles, authentication material, provider tokens, dating answers, or report content. Use buckets when exact values are unnecessary. Every event carries a schema version.

## Events

| Event | Purpose | Representative properties |
|---|---|---|
| `app_opened` | Entry context | `source`, `authState`, `providerConnected` |
| `now_playing_detected` | Current playback readiness | `provider`, `available`, `matchConfidence` |
| `live_presence_impression` | Availability shown | `countBucket`, `source` |
| `session_start_tapped` | Intent to open listening | `surface`, `currentTrackUsed`, `privacy` |
| `session_created` | Server-created session | `provider`, `privacy`, `trackMatchMethod` |
| `invite_sent` | Invitation attempt | `channel`, `relationshipType` |
| `knock_sent` | Permission request | `relationshipType`, `surface` |
| `join_started` | Join attempt | `openOrKnock`, `providerPair` |
| `join_succeeded` | Successful shared audio | `latencyMs`, `initialDriftBucket` |
| `join_failed` | Failed shared audio | `failureCode`, `providerPair` |
| `session_30s_reached` | Early survival | `participantCount` |
| `session_5m_reached` | Meaningful duration threshold | `participantCount` |
| `pulse_sent` | Relational action | `sessionAgeBucket`, `pulseType` |
| `queue_item_added` | Collaborative action | `hostOrGuest`, `matchConfidence` |
| `sync_corrected` | Reliability | `driftBucket`, `correctionType` |
| `session_ended` | Outcome | `durationBucket`, `reason`, `participantCount` |
| `anchor_created` | Retention artifact | `automaticOrManual`, `moodAdded` |
| `privacy_mode_changed` | Trust behavior | `oldMode`, `newMode`, `surface` |
| `match_explanation_opened` | Discovery explainability | `discoverySurface` |
| `match_feedback_given` | Ranking quality | `accurate`, `inaccurateReason` |
| `error_shown` | Perceived failure | `domain`, `code`, `recoverable` |

The API validates these names and rejects sensitive property keys.
