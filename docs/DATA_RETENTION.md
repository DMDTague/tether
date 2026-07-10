# Data retention defaults

- Presence: five minutes unless actively refreshed.
- Coarse discovery location: fifteen minutes.
- WebSocket ticket: one minute.
- Product telemetry: retain only as long as required for active reliability and product analysis; define the production duration before launch.
- Message and safety content: excluded from product telemetry.
- Memory Anchors and Capsules: user-controlled relationship artifacts with export and deletion support.
- Refresh sessions: thirty-day maximum with rotation and revocation; shared persistence required before production.

Retention periods should be visible to users and reviewed whenever a new data category is introduced.
