# Demo v0.6 — Correctness & Live-Feel Audit

Every interactive flow in `demo/` was exercised end-to-end in a headless DOM harness
(50-profile dataset, all five tabs, both onboarding flows, every modal, every
session type). This pass targets one goal: the demo behaves exactly as the real,
populated app would, with no dead controls and no simulated-feeling gaps.

## Fixed in this pass

### Messaging
- Sent messages now receive an actual contextual reply (referencing the other
  person's real top artist / current track) after the typing indicator, instead
  of the indicator vanishing into nothing. Conversation previews update.
- The Reply action on every Exchange review now works — previously the
  top-ranked review's Reply was a dead button because that author had no
  seeded conversation. Conversations are now created on demand.
- The "+" compose button opens a real people picker (live and high-match
  people first) instead of showing an instructional toast.
- Conversation search shows an empty state instead of a blank panel.
- Blocked users are removed from the conversation list.

### Sessions
- Track progress, elapsed/remaining time, and auto-crossfade to the next track
  now advance live every second. Progress no longer freezes at the join point.
- Starting your own Stage no longer reads "Listening with John Roastpork" with
  a duplicated JR avatar and a random stranger in the listener stack. It is now
  framed as "Your Stage is live," and ~6 seconds in, a compatible friend joins
  (avatar, header update, toast) and unlocks Pulses.
- Pulses on a solo Stage are locked with an explanatory label; the global pulse
  cooldown no longer incorrectly re-enables them before a friend joins.
- Track change updates artist and resets progress/time, drawing from a queue of
  original fictional artists; pause labels adapt to host vs. own Stage.
- Ending a shared session records a Memory Anchor with a real distance; the
  previous behavior produced "NaN miles" for self sessions and rendered every
  anchor into a hidden container. Self sessions correctly end without an anchor.

### The Exchange
- Publishing a post actually publishes it: it appears at the top of For You as
  "You," with a "verified listen" badge when a heard asset is attached, and the
  view switches to the feed.
- Saving a rating writes it to the History tab (Platinum shown as 6.0).
- The rating slider supports keyboard arrows (half-steps, Platinum past 5.0).
- The Rate action uses the signal-bloom mark; the last stock "☆" glyph is gone.
- Reviews from muted users are hidden, matching the mute copy.
- The History row grid no longer clips the five-bloom strip into a 32px column.

### Profiles, Home, and safety
- Profile bios no longer show the raw "22 | Name | Fun fact:" data prefix; age
  moved into the handle line.
- Blocking now propagates everywhere: Home rail, Hot Tethers, Wavelength swipe
  queue, radar, people list, reviews, and Messages. Muting hides the person's
  sessions and posts.
- Distance bands handle 15+ miles honestly instead of capping at "10–15 miles."
- The Home greeting derives from the actual date and time of day instead of a
  hardcoded "Tuesday evening."
- Removed dead legacy containers (`#activity-feed`, hidden anchor feed) and the
  unused activity renderer; Memory Anchors now live visibly on the profile.

### Mobile input hardening
- The Pulse button gained `touch-action: none` and touch-callout suppression so
  the 1.5-second hold works on iOS instead of triggering scroll/long-press.
  (Swipe cards and the rating slider already had this.)

## Verified end-to-end (no errors)
Navigation across all tabs; friends and dating onboarding including Tune
re-entry; swipe pass/connect/profile, drag, arrow keys, deck exhaustion and
reset; radar radius bands, ad-unlock gating, signal preview, View Profile;
list search and all four filters; join (open door), knock, capsule composer
(offline), ghost-disabled state; follow, message, mute/block/report with
confirmations; pulse charge/release/cooldown; host pause/resume; track change;
session timer and progress; solo Stage friend-join; review rating floor 1.0,
half-steps, Platinum at 6.0 via drag and keyboard; draft validation (text-only
allowed, unheard blocked, heard verified) and publish; capsule unlock; privacy
modes; service switching; Tap to Tether; Escape stacking order.
