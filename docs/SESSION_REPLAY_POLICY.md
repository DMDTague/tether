# Session replay policy

Session replay is not enabled by this overhaul. A future implementation must be opt-controlled, sampled at a low rate, and masked on-device before transmission.

Always exclude or mask:

- Chats, names, handles, and avatars.
- Search fields and private track selections.
- Location and discovery-permission controls.
- Dating identity and orientation fields.
- Authentication, account recovery, and provider tokens.
- Report, block, mute, and safety forms.

Replay may be used to diagnose dead clicks, broken navigation, rendering failures, and join-flow confusion. It may not be used to reconstruct private relationships or listening histories.
