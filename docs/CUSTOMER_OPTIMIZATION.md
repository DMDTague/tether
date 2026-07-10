# Customer optimization standard

Tether should be feature-rich without making the customer carry the complexity. Every surface is evaluated against the same journey:

> **Discover → understand → act → continue**

A feature is incomplete when it looks finished but does not help the customer reach the next meaningful outcome.

## Core rules

### Start from intent

Creation begins with what the customer wants to preserve:

- Publish an argument → Review
- Remember something privately → Diary
- Curate a collection → List
- Share the present moment → Tether

The customer should not have to understand the product's data model before acting.

### One primary action

Every important surface has one visually dominant action:

- Home → Open your listening
- Review → Listen or respond
- Diary entry → Continue through Review, List, or Tether
- List → Play or Tether
- Profile → Tether
- Dating profile → Leave a song, answer a prompt, or open the full profile
- Stage → Remain synchronized and present

Secondary actions remain available without competing with the primary outcome.

### Preserve work and context

- Draft text survives navigation and accidental closure.
- Diary, lists, preferences, and profile settings persist.
- A customer can undo a Dating pass before it becomes final.
- The product remembers which cultural surface was in use.
- Contextual actions carry the relevant music object or person into the next flow whenever the backend can support it.

### Progressive disclosure

The first useful action should happen before configuration fatigue begins.

- Start a Tether before adjusting every invitation and privacy detail.
- Enable Dating before being asked to publish optional physical information.
- Log a listen without requiring a public review.
- Create a list before requiring cover design or elaborate metadata.
- Read the recommendation evidence before opening advanced matching controls.

### No dead ends

Every persistent music object leads somewhere:

- A review can be played, discussed, saved, logged, or used to start a Tether.
- A diary entry can become a review, enter a list, or reopen the music.
- A list can be played, saved, shared, or listened through together.
- A profile can lead to message, song gesture, follow, Knock, Join, or Tether.
- A Dating recommendation can lead to a prompt response, song gesture, full profile, pass, or preference adjustment.

### Explain systems in human language

The app describes effects rather than internal mechanics:

- “Friends can join” rather than a raw privacy enum.
- “Why this person” rather than an unexplained score.
- “Private note” rather than a visibility implementation detail.
- “Quietly passed” rather than a destructive swipe state.

### Reversibility and control

- Passes are private and briefly undoable.
- Dating enablement and visibility are separate.
- Height and body description are independently publishable.
- Diary entries are private by default.
- Lists and reviews expose explicit visibility choices.
- Safety actions propagate through every surface.

### Performance of value

The product must feel fast because valuable outcomes are fast—not because animation is removed indiscriminately.

The operating promise is the **Ten-second Tether**. Secondary settings can be edited after the Stage opens. The cultural layer should likewise support a two-tap diary log, a direct review composer, and list creation without preliminary setup screens.

## Feature-specific acceptance criteria

### Exchange

- Review, Diary, and List are visible as distinct intents.
- Creation is reachable globally and from relevant music objects.
- Reviews expose immediate listening and relationship actions.
- Following and recommendation feeds have useful empty states.
- A customer never loses a draft because they checked another tab.

### Diary

- Logging does not require public writing.
- Rating is optional.
- Notes remain private.
- Entries can become reviews or list items without re-entering the music identity.
- Tether sessions can create diary entries automatically.

### Lists

- Ranked and unranked collections are supported.
- Visibility is explicit.
- Lists can be played from the top or opened as a Tether queue.
- Saving and sharing preserve attribution.
- Empty lists still provide a clear next action.

### Wavelength Dating

- Dating is opt-in and does not replace the ordinary profile.
- Recommendations explain musical evidence before presenting false certainty.
- Identity, orientation, intent, relationship structure, age, distance, priority music, dealbreakers, concerts, and prompts form a coherent profile.
- Physical descriptors are optional and separately publishable.
- Passes are private, undoable briefly, and useful for preference tuning.
- Connection can begin with a song or prompt rather than a generic like.

### Profiles

- Profiles synthesize current listening, cultural output, taste, lists, diary signals, Tether history, and memories.
- Message, song gesture, and Tether remain persistently reachable.
- Public identity never leaks private diary or matching preferences.

### Tether

- Starting is immediate.
- Join/Knock/Open Door/Ghost consequences are clear.
- Provider coordination and sync failures have recoverable states.
- Stage actions are relational rather than decorative.
- Ending produces a useful continuation: diary entry, Memory Anchor, message, review, or list addition.

## Measurement

Optimization is measured by customer outcomes rather than raw taps:

- Time to first Tether
- Tether completion and repeat rate
- Review-to-listen and review-to-Tether conversion
- Diary week-two retention
- Diary-to-review and diary-to-list conversion
- List play-through and shared-listen rate
- Dating recommendation explanation opens, song gestures, meaningful conversations, and safety actions
- Draft recovery rate and abandoned creation flows

Analytics may record the action type and surface, but never review text, titles, artists, diary notes, prompts, identity, orientation, height, relationship details, messages, searches, coordinates, or credentials.
