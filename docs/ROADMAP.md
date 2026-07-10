# Tether implementation roadmap

The concentrated overhaul establishes the product direction and trust boundaries. Remaining work should deepen the same loop rather than reopen the previous feature sprawl.

## Next: real ten-second Tether

- Bind the Listen hero to actual provider playback.
- Rank likely listeners from real relationship and session history.
- Implement universal invitation links and a lightweight web join.
- Add provider mismatch explanations and verified fallback tracks.
- Persist automatic Memory Anchors through the API.

## Then: shared infrastructure

- Move refresh and revocation state to Redis or the database.
- Persist typed events to an analytics sink with retention controls.
- Build join-latency, sync-drift, and failure dashboards.
- Add feature flags and controlled experiments.
- Add user-facing export, deletion, and personalization controls.

## Then: retention

- Weekly Your Tethers recap.
- Relationship-specific listening summaries.
- Shareable Memory Anchor cards.
- Intelligent return prompts based on real co-listening history.
- Group sessions only after the two-person loop meets reliability targets.
