# Tether as a complete music platform

## Thesis

Tether is the social world for people whose lives are organized through music. Shared listening is the unique center of gravity, not the only feature.

The product must work at three time scales:

1. **Right now** — someone is listening and another person enters the same moment.
2. **Across the week** — people review, rate, log, list, recommend, message, and discover.
3. **Across a relationship** — sessions accumulate into Memory Anchors, shared identities, private rituals, and possible friendship or romance.

## Product hierarchy

### Home: orientation

Home answers what is alive now and what deserves continuation. It should mix current playback, open sessions, relevant Exchange activity, unfinished records, invitations, and resurfaced memories without becoming an undifferentiated feed.

### Exchange: music culture

Exchange is the Letterboxd-like persistence layer. Its fundamental objects are:

- **Review** — public interpretation attached to a track, album, artist, concert, playlist, or Tether session.
- **Rating** — a personal score that may exist without a written review.
- **Diary entry** — a private chronological record of listening. Notes remain private unless explicitly converted into a review.
- **List** — an ordered or unordered musical argument, with public, followers-only, or private visibility.
- **Reply** — discourse that can remain public or move into a contextual message.

Exchange should produce action. Every cultural object can lead to listening, saving, messaging, following, or opening a Tether.

### Tether: presence

Tether is centered in navigation and should remain reachable in one action. It includes Join, Knock, Invite, synchronized playback, Stage, Pulse, queue, ending rituals, Memory Anchors, and Time Capsules.

### Wavelength: people and scenes

Wavelength uses music to discover friends, communities, local scenes, and dating prospects. Dating is not a separate social graph; it is an additional, explicitly enabled projection of the same music identity.

Recommendations use evidence such as sustained artist affinity, albums, diary patterns, reviews, lists, concert behavior, local scene overlap, and mutual people. The interface explains the evidence and avoids false numerical certainty.

### You: accumulated identity

A profile is where all systems meet: visual atmosphere, current listening, top artists, favorite records, diary, reviews, lists, Tether history, Memory Anchors, concerts, communities, dating controls, and privacy settings.

## Dating model

Dating profiles may include identity, orientation, intent, relationship structure, age range, distance preference, optional height and body language, priority artists and albums, dealbreakers, genres, concert habits, and music-specific prompts.

Privacy rules:

- Dating is disabled by default.
- Enablement and visibility are separate choices.
- Ordinary profiles never expose dating data.
- Height and body description have separate publication toggles.
- Dealbreakers and matching filters are private inputs.
- Analytics never receive identity, orientation, height, relationship details, prompts, answers, or music-object text.

## Design principle

Restore the v14 visual grammar as the base. Improve its hierarchy and correctness without replacing its density, theatricality, or unusual social-music identity.

The system may be quiet in settings and infrastructure, but profiles, Exchange, Wavelength, Tether Stage, Pulse, and memories should be aesthetically consequential.

## Success measures

Primary:

- Meaningful Shared Listens per Weekly Active User
- Review/list/diary interactions that convert into a Tether
- Relationships with repeated shared listens

Supporting:

- Weekly diary retention
- Reviews created and rated
- Lists created, saved, and completed
- Exchange-to-provider play conversion
- Wavelength connection quality and safety actions
- Time from app open to synchronized listening
