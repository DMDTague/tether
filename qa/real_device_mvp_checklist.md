# Tether Real-Device MVP Checklist

Before cutting the beta release build for real devices (iOS/Android), verify the following scenarios.

## 1. Provider Combinations
- [ ] **Spotify -> Spotify**: Host listening on Spotify, listener joins on Spotify.
- [ ] **Spotify -> Apple Music**: Host listening on Spotify, listener joins on Apple Music.
- [ ] **Apple Music -> Spotify**: Host listening on Apple Music, listener joins on Spotify.
- [ ] **Apple Music -> Apple Music**: Host listening on Apple Music, listener joins on Apple Music.

## 2. Privacy & Auth Modes
- [ ] **Open-Door Mode**: Listener taps Tether -> Instantly joins the session.
- [ ] **Knock-First Mode (Accepted)**: Listener taps Tether -> Knock pending. Host accepts -> Listener instantly joins.
- [ ] **Knock-First Mode (Declined)**: Listener taps Tether -> Knock pending. Host declines -> Listener sees "Knock declined" and cannot join.
- [ ] **Ghost Mode**: Host is listening but does not appear as "listening now" to friends. Cannot be tethered.

## 3. Drift & Synchronization
- [ ] **Initial Sync**: Listener joins and is within 500ms of host position.
- [ ] **Soft Drift (2s-5s)**: Network lags temporarily; app should emit `drift_exceeded_soft` logs and attempt to gracefully handle.
- [ ] **Hard Drift (>5s)**: Backgrounding the app for 10s then reopening; app should emit `drift_exceeded_hard` and snap back into sync.

## 4. Playback Events
- [ ] **Host Pauses**: Listener's playback pauses almost immediately.
- [ ] **Host Resumes**: Listener's playback resumes.
- [ ] **Host Skips**: Listener skips to new track.

## 5. Ambiguous Matches
- [ ] **Different Duration / Remaster**: Host listens to a specific live version, matching returns multiple with low confidence -> Listener is shown "Ambiguous match: cannot tether confidently." and blocked from joining.

## 6. Memory Anchors
- [ ] **Successful Tether**: Listener successfully joins. Host terminates session after >2 mins -> Both host and listener receive `memory_created` event and see "Saved as a memory."
- [ ] **Failed / Short Tether**: Listener joins but leaves after 1 min -> Host sees "Couldn't save memory."
- [ ] **Ambiguous / Blocked Tether**: Listener fails to join -> No memory anchor created.

## 7. App State & Observability
- [ ] **Observability Verification**: Logs for `tether_attempt_started`, `tether_attempt_failed`, `provider_play_started` are visible in the backend / production logging console.
- [ ] **Background/Foreground Transition**: App cleanly resyncs WS connection and playback epoch when returning to foreground.
