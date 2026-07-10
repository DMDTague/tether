# Instrumentation checklist

For every new event:

- Use an allowed, documented event name.
- Increment or preserve the schema version intentionally.
- Prefer buckets over exact values.
- Keep server authority for joins, duration, sync, and delivery.
- Exclude content, contact data, precise location, and credentials.
- Add or update contract tests.
- Confirm the event supports a decision tied to customer value or a guardrail.

Delete events that no longer support an active decision.
