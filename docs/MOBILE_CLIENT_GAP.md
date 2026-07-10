# Mobile client gap

The repository documentation previously described a complete React Native / Expo client, but the auditable committed client is the browser prototype in `demo/`.

Before calling the project mobile-ready, commit and verify:

- Application entry points, navigation, screens, and state management.
- Provider authentication and secure token storage.
- Native playback and synchronization behavior.
- Push notification and deep-link handling.
- Native haptics and reduced-motion behavior.
- Build configuration, signing, environment separation, and store metadata.
- Automated tests and real-device QA.

Until then, the accurate description is: FastAPI backend plus interactive browser product prototype.
