# Premium OS & Social Features

## Terminology (`mobile/theme/copy.ts`)
- **Tether** — verb (connect)
- **Tethered** — state
- **Tethers** — noun (people in your graph)
- REST paths still use `/api/friends` for DB compatibility

## Haptic Whispers
- Double-tap album art in `SessionOverlay` → WS `pulse` → host gets haptic + purple spark (`GlobalSparkAnimation`)
- Hold-to-pulse button remains for intentional long pulses

## Tap to Tether (NFC)
- `POST /api/tethers/tap` — instant accepted friendship
- `TapToTetherModal` + `useTapToTether` — NDEF payload `tether:{user_id}`
- Header ⟡ opens modal on Home

## Ghost Sesh
- Pull down on `HomeHub` → `GhostContext` → OLED black UI, backdrop off
- `privacy_mode: ghost` synced via `PATCH /api/users/me`
- Discovery returns `[]` for ghost users; ghost users excluded from match pool

## Tether Island (Live Activities)
- Expo plugin: `mobile/plugins/withTetherIsland.js` (sets `NSSupportsLiveActivities`)
- Bridge: `mobile/services/tetherIsland.ts` + `useTetherIsland` (background during Sesh)
- **Next step:** Add native `TetherIsland` Swift module + Widget Extension for waveform + host avatar in Dynamic Island (requires `npx expo prebuild` + Xcode)

## Rebuild required
```bash
cd mobile && npx expo prebuild --clean && npx expo run:ios
```
