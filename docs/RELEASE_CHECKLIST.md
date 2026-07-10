# Public-beta release checklist

The overhaul removes known prototype contradictions, but it does not by itself make Tether production-ready.

- [ ] Move refresh-token rotation and revocation state to Redis or the primary database.
- [ ] Configure a unique production secret and explicit HTTPS CORS origins.
- [ ] Add database migrations for any authentication/session persistence changes.
- [ ] Verify Spotify and Apple Music provider compliance and fallback behavior.
- [ ] Test cross-provider joins, drift correction, reconnects, and track mismatch on real devices.
- [ ] Add abuse reporting operations, response expectations, and account recovery.
- [ ] Verify invitation links across installed-app, web fallback, and unavailable-track states.
- [ ] Add crash, latency, battery, and cellular-data monitoring.
- [ ] Review analytics dashboards against the event dictionary and privacy rules.
- [ ] Commit and test the actual mobile client before describing the repository as mobile-ready.
