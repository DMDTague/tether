(() => {
  "use strict";

  const STORE_KEY = "tether.v1";

  const ICONS = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8.5c0 5-8 10-8 10s-8-5-8-10C4 5.7 6 4 8.4 4c1.5 0 2.8.8 3.6 2 .8-1.2 2.1-2 3.6-2C18 4 20 5.7 20 8.5Z"/></svg>',
    pass: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    signal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.6 5 3.4 8 8 9-4.6 1-7.4 4-8 9-.6-5-3.4-8-8-9 4.6-1 7.4-4 8-9Z"/></svg>',
    message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>',
    join: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h3l2-5 4 10 2-5h5"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4Z"/></svg>',
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 8-5 4 5 4"/><path d="M6 12h7c4 0 6 2 6 5"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  };

  const TRACKS = {
    nightTransit: { title: "Night Transit", artist: "Signal Studies", album: "Nocturne Lines", a: "#8b7cff", b: "#3fd9a4" },
    borrowedTime: { title: "Borrowed Time", artist: "Aminé", album: "Late Return", a: "#f5b04c", b: "#9c52e4" },
    warmSignal: { title: "Warm Signal", artist: "Noname", album: "Soft Power", a: "#d16d88", b: "#3fd9a4" },
    weirdFishes: { title: "Weird Fishes / Arpeggi", artist: "Radiohead", album: "In Rainbows", a: "#d55875", b: "#27385e" },
    eusexua: { title: "Eusexua", artist: "FKA twigs", album: "Eusexua", a: "#bb5bdc", b: "#e9a1c2" },
    imaginalDisk: { title: "Imaginal Disk", artist: "Magdalena Bay", album: "Imaginal Disk", a: "#ff4ca0", b: "#6244e3" },
    grace: { title: "Grace", artist: "Jeff Buckley", album: "Grace", a: "#235a77", b: "#c5a178" },
    jubilee: { title: "Paprika", artist: "Japanese Breakfast", album: "Jubilee", a: "#e6bb45", b: "#ca593e" },
    blonde: { title: "Pink + White", artist: "Frank Ocean", album: "Blonde", a: "#73a36a", b: "#e9d9bd" },
    bonIver: { title: "Holocene", artist: "Bon Iver", album: "Bon Iver", a: "#8f9b7d", b: "#d3cdb8" },
  };

  const PEOPLE = [
    {
      id: "raj",
      name: "Raj Santos",
      first: "Raj",
      age: 25,
      pronouns: "he/him",
      handle: "@raj.afterhours",
      avatar: "avatars/raj_725.svg",
      city: "Around Philly",
      band: "Nearby",
      status: "open",
      track: TRACKS.borrowedTime,
      bio: "Basement shows, patient album listens, and walking home after the encore.",
      artists: ["Tyler, The Creator", "Radiohead", "Aminé"],
      intent: "Friends and community",
      structure: "Not shown",
      community: "Philly night listeners",
      evidence: "You both finish albums in order and keep Radiohead in late-night rotation.",
      anthem: TRACKS.weirdFishes,
      review: "An album can be loud without ever asking you to stop listening closely.",
    },
    {
      id: "mary",
      name: "Mary Davis",
      first: "Mary",
      age: 23,
      pronouns: "she/her",
      handle: "@marylistens",
      avatar: "avatars/realmary.svg",
      city: "Philadelphia",
      band: "Around Philly",
      status: "knock",
      track: TRACKS.warmSignal,
      bio: "I make playlists like letters and always stay through the credits.",
      artists: ["Noname", "Solange", "Little Simz"],
      intent: "Friends",
      structure: "Not shown",
      community: "Soft-spoken rap",
      evidence: "You both save lyric-heavy records and return to Noname after midnight.",
      anthem: TRACKS.warmSignal,
      review: "The restraint is the point. Every space leaves room for the line to land.",
    },
    {
      id: "zuri",
      name: "Zuri King",
      first: "Zuri",
      age: 24,
      pronouns: "she/her",
      handle: "@zuri.wav",
      avatar: "avatars/x_zuri_x.svg",
      city: "Philadelphia",
      band: "Nearby",
      status: "live",
      track: TRACKS.eusexua,
      bio: "Tiny venues, huge bridges, and very specific walking playlists.",
      artists: ["FKA twigs", "Amaarae", "Tems"],
      intent: "Long-term · slow burn",
      structure: "Monogamous",
      community: "Dance floor romantics",
      evidence: "You share late-night listening, two communities, and the same appetite for dramatic pop.",
      anthem: TRACKS.eusexua,
      review: "A song that understands the dance floor as somewhere spiritual.",
    },
    {
      id: "aaliyah",
      name: "Aaliyah Anderson",
      first: "Aaliyah",
      age: 22,
      pronouns: "she/her",
      handle: "@aaliyahloops",
      avatar: "avatars/aaliyah_886.svg",
      city: "Philadelphia",
      band: "Around Philly",
      status: "offline",
      track: TRACKS.jubilee,
      bio: "Record-store Sundays, loud colors, and songs that feel like sunlight.",
      artists: ["Japanese Breakfast", "Caroline Polachek", "Charli xcx"],
      intent: "Long-term",
      structure: "Open to exploring",
      community: "Indie pop Philadelphia",
      evidence: "You both use Japanese Breakfast as a bridge between joy and grief.",
      anthem: TRACKS.jubilee,
      review: "Brightness becomes a serious emotional language when it has survived grief.",
    },
    {
      id: "hiroshi",
      name: "Hiroshi Perez",
      first: "Hiroshi",
      age: 25,
      pronouns: "he/him",
      handle: "@hiroshi.plays",
      avatar: "avatars/realhiroshi.svg",
      city: "Greater region",
      band: "Greater region",
      status: "offline",
      track: TRACKS.imaginalDisk,
      bio: "Sourdough, maximalist pop, and taking the long train for the right show.",
      artists: ["Magdalena Bay", "Rosalía", "Kaytranada"],
      intent: "Dating and friends",
      structure: "Monogamous",
      community: "Maximal pop",
      evidence: "You both reward ambitious records and save songs with strange internal worlds.",
      anthem: TRACKS.imaginalDisk,
      review: "Maximal without becoming shapeless. Every synth opens another doorway.",
    },
    {
      id: "kevin",
      name: "Kevin Johnson",
      first: "Kevin",
      age: 26,
      pronouns: "he/him",
      handle: "@kevinonvinyl",
      avatar: "avatars/realkevin.svg",
      city: "Philadelphia",
      band: "Nearby",
      status: "open",
      track: TRACKS.grace,
      bio: "Guitar records, quiet kitchens, and never skipping the sad one.",
      artists: ["Jeff Buckley", "Big Thief", "Adrianne Lenker"],
      intent: "Friends",
      structure: "Not shown",
      community: "Songwriters",
      evidence: "You both return to Jeff Buckley and Big Thief when the room gets quiet.",
      anthem: TRACKS.grace,
      review: "The voice is spectacular, but the silences are what make the record intimate.",
    },
  ];

  const REVIEWS = [
    {
      id: "imaginal",
      person: "hiroshi",
      time: "18m",
      object: TRACKS.imaginalDisk,
      rating: "4.5",
      text: "Maximal without becoming shapeless. Every synth choice feels like another doorway, but the melodies keep pulling the whole thing back into focus.",
      quote: "This is exactly the take I needed today.",
      replies: 4,
    },
    {
      id: "eusexua",
      person: "zuri",
      time: "42m",
      object: TRACKS.eusexua,
      rating: "5.0",
      text: "A song that understands the dance floor as somewhere spiritual. The restraint is what makes the release hit.",
      quote: "Felt this in my chest. Instant save.",
      replies: 7,
    },
    {
      id: "grace",
      person: "kevin",
      time: "2h",
      object: TRACKS.grace,
      rating: "6.0",
      text: "The mythology around the voice can hide how physical this record is. Every breath and string squeak puts another person in the room.",
      quote: "This is why the Platinum rating exists.",
      replies: 12,
    },
  ];

  const DEFAULT_STATE = {
    account: {
      claimed: false,
      displayName: "Alex Rivera",
      handle: "alex.hears",
      city: "Philadelphia",
      birthDate: "",
      photo: "avatars/realjohn.svg",
      bio: "Finding people through the songs that say it first.",
    },
    profile: {
      chips: ["Album-order loyalist", "Late-night listener", "Emotion-first"],
      topArtists: ["Jeff Buckley", "Radiohead", "Japanese Breakfast", "Frank Ocean", "Bon Iver"],
    },
    dating: {
      enabled: false,
      discoverable: false,
      tab: "deck",
      index: 0,
      passed: [],
      saved: [],
      liked: [],
      signals: ["zuri", "aaliyah"],
    },
    culture: { feed: "for-you", saved: [], ratings: {} },
    session: { privacy: "open", active: false, personId: null, pulses: 0 },
    ui: { view: "listen", peopleMode: "people" },
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[character]);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!saved || typeof saved !== "object") return clone(DEFAULT_STATE);
      return {
        account: { ...DEFAULT_STATE.account, ...saved.account },
        profile: { ...DEFAULT_STATE.profile, ...saved.profile },
        dating: { ...DEFAULT_STATE.dating, ...saved.dating },
        culture: { ...DEFAULT_STATE.culture, ...saved.culture },
        session: { ...DEFAULT_STATE.session, ...saved.session, active: false },
        ui: { ...DEFAULT_STATE.ui, ...saved.ui },
      };
    } catch {
      return clone(DEFAULT_STATE);
    }
  }

  let state = loadState();
  let overlay = null;
  let toastTimer = 0;
  let sessionTimer = 0;
  let sessionSeconds = 0;
  let pulseTimer = 0;
  let pulseReady = false;
  let setupStep = 0;
  let setupDraft = {};

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function personById(id) {
    return PEOPLE.find(person => person.id === id) || PEOPLE[0];
  }

  function coverHTML(track, className = "") {
    const bars = [42, 70, 92, 56, 76, 48, 86].map(height => `<i style="--bar:${height}px"></i>`).join("");
    return `<div class="cover-art ${className}" style="--cover-a:${track.a};--cover-b:${track.b}" role="img" aria-label="${escapeHTML(track.album)} artwork"><span class="cover-wave" aria-hidden="true">${bars}</span></div>`;
  }

  function ratingHTML(value) {
    const platinum = Number(value) >= 6;
    return `<div class="rating ${platinum ? "platinum" : ""}">${ICONS.star}<span>${escapeHTML(value)}${platinum ? " · Platinum" : "/5"}</span></div>`;
  }

  function avatar(person, className = "") {
    return `<img class="${className}" src="${person.avatar}" alt="">`;
  }

  function render() {
    renderListen();
    renderExchange();
    renderPeople();
    renderYou();
    syncShell();
  }

  function syncShell() {
    $$("[data-view-panel]").forEach(panel => {
      const active = panel.dataset.viewPanel === state.ui.view;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    $$("[data-nav]").forEach(button => {
      const active = button.dataset.nav === state.ui.view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $$("[data-self-avatar]").forEach(image => {
      image.src = state.account.photo;
    });
    $(".avatar-button")?.setAttribute("aria-label", state.account.claimed ? `Open ${state.account.displayName}'s profile` : "Claim your Tether profile");
  }

  function renderListen() {
    const onAir = PEOPLE.filter(person => person.status === "open" || person.status === "knock").slice(0, 4);
    $("#listen-view").innerHTML = `
      <header class="view-header">
        <div class="view-header-copy">
          <p class="eyebrow">Live in Philadelphia</p>
          <h1>Be there in the song.</h1>
          <p>Open your listening or step into someone else's exact moment.</p>
        </div>
        <button class="text-button" data-action="about">About</button>
      </header>

      <article class="signal-hero" aria-label="Your current listening">
        <div class="hero-status">
          <span class="status-pill">Playing on Spotify</span>
          <span class="band-pill">Your signal</span>
        </div>
        ${coverHTML(TRACKS.nightTransit, "hero-art")}
        <div class="hero-copy">
          <span class="album-label">${TRACKS.nightTransit.artist}</span>
          <h2>${TRACKS.nightTransit.title}</h2>
          <p>${TRACKS.nightTransit.album}</p>
        </div>
        <div class="hero-actions">
          <button class="button primary" data-action="open-session">${ICONS.join} Open your listening</button>
          <label class="door-control">
            <span><small>Who can enter</small><b>${state.session.privacy === "open" ? "Open Door" : state.session.privacy === "knock" ? "Knock First" : "Ghost"}</b></span>
            <select data-privacy aria-label="Listening privacy">
              <option value="open" ${state.session.privacy === "open" ? "selected" : ""}>Open Door</option>
              <option value="knock" ${state.session.privacy === "knock" ? "selected" : ""}>Knock First</option>
              <option value="ghost" ${state.session.privacy === "ghost" ? "selected" : ""}>Ghost</option>
            </select>
          </label>
        </div>
      </article>

      <div class="section-heading">
        <div><p class="eyebrow">On air now</p><h2>Walk into the moment</h2></div>
        <span>${onAir.length} people live</span>
      </div>
      <div class="on-air-rail" aria-label="Friends listening now">
        ${onAir.map(person => `
          <article class="on-air-card">
            ${coverHTML(person.track, "mini-art")}
            <button class="on-air-person" data-profile="${person.id}" aria-label="Open ${person.name}'s profile">${avatar(person)}</button>
            <div class="on-air-copy"><strong>${person.name}</strong><span>${person.track.title}</span></div>
            <button class="on-air-action" data-join="${person.id}">${person.status === "knock" ? "Knock first" : "Join now"}</button>
          </article>
        `).join("")}
      </div>

      <div class="knock-strip">
        <div class="knock-stack">${avatar(PEOPLE[2])}${avatar(PEOPLE[3])}</div>
        <div class="knock-strip-copy"><strong>Two people are at your door</strong><span>Zuri knocked · Aaliyah invited you</span></div>
        <button data-action="knocks">Open</button>
      </div>

      <div class="section-heading">
        <div><p class="eyebrow">Tonight</p><h2>Philadelphia is listening</h2></div>
        <button data-nav-jump="exchange">See Exchange</button>
      </div>
      <article class="city-signal">
        <p class="eyebrow">Live city signal</p>
        <h3>Records moving through the city</h3>
        <div class="city-lines">
          ${[
            ["01", "Imaginal Disk", "Magdalena Bay", "184"],
            ["02", "Eusexua", "FKA twigs", "96"],
            ["03", "Grace", "Jeff Buckley", "73"],
          ].map(row => `<div class="city-line"><span class="rank">${row[0]}</span><div><strong>${row[1]}</strong><span>${row[2]}</span></div><b>${row[3]} live</b></div>`).join("")}
        </div>
      </article>`;
  }

  function renderExchange() {
    $("#exchange-view").innerHTML = `
      <header class="view-header">
        <div class="view-header-copy">
          <p class="eyebrow">The cultural record</p>
          <h1>Exchange</h1>
          <p>Reviews, lists, and the ideas music leaves behind.</p>
        </div>
      </header>
      <div class="exchange-tabs" role="tablist" aria-label="Exchange feeds">
        ${[
          ["for-you", "For you"],
          ["following", "Following"],
          ["local", "Local"],
        ].map(([id, label]) => `<button class="${state.culture.feed === id ? "active" : ""}" data-feed="${id}" role="tab" aria-selected="${state.culture.feed === id}">${label}</button>`).join("")}
      </div>
      <button class="composer" data-action="create">
        <img src="${state.account.photo}" alt="">
        <span><strong>Say what the music did</strong><small>Review a record or build a list</small></span>
        <i aria-hidden="true">+</i>
      </button>
      <div class="exchange-feed">
        ${REVIEWS.map(review => {
          const person = personById(review.person);
          const saved = state.culture.saved.includes(review.id);
          const ownRating = state.culture.ratings[review.id];
          return `<article class="review-post">
            <div class="review-author">
              <button class="avatar-button" data-profile="${person.id}" aria-label="Open ${person.name}'s profile">${avatar(person)}</button>
              <span><strong>${person.name}</strong><small>reviewed ${review.object.album}</small></span>
              <time>${review.time}</time>
            </div>
            <div class="review-object">
              ${coverHTML(review.object)}
              <div class="object-copy"><p>${review.object.artist}</p><h3>${review.object.album}</h3>${ratingHTML(review.rating)}</div>
            </div>
            <p class="review-body">${review.text}</p>
            <blockquote class="review-pullquote">“${review.quote}”</blockquote>
            <div class="post-actions">
              <button data-rate="${review.id}">${ICONS.star}<span>${ownRating ? `Your rating ${ownRating}` : "Rate"}</span></button>
              <button data-chat="${person.id}">${ICONS.reply}<span>${review.replies} replies</span></button>
              <button data-join="${person.id}">${ICONS.join}<span>Listen</span></button>
              <button data-save="${review.id}">${ICONS.save}<span>${saved ? "Saved" : "Save"}</span></button>
            </div>
          </article>`;
        }).join("")}
      </div>`;
  }

  function renderPeople() {
    const dating = state.ui.peopleMode === "dating";
    $("#people-view").innerHTML = `
      <header class="view-header">
        <div class="view-header-copy">
          <p class="eyebrow">${dating ? "Private by design" : "Your music network"}</p>
          <h1>${dating ? "Dating" : "People"}</h1>
          <p>${dating ? "Meet through taste. Start with a song." : "The people, conversations, and scenes behind your listening."}</p>
        </div>
      </header>
      <div class="people-mode" role="tablist" aria-label="People and Dating">
        <button class="${dating ? "" : "active"}" data-mode="people" role="tab" aria-selected="${!dating}">People</button>
        <button class="${dating ? "active" : ""}" data-mode="dating" role="tab" aria-selected="${dating}">Dating <span class="mode-count">${state.dating.signals.length}</span></button>
      </div>
      ${dating ? renderDating() : renderSocialPeople()}`;
  }

  function renderSocialPeople() {
    return `
      <div class="section-heading">
        <div><p class="eyebrow">Live doors</p><h2>Listening now</h2></div>
        <span>Join or knock</span>
      </div>
      <div class="live-doors">
        ${PEOPLE.filter(person => person.status !== "offline").map(person => `
          <button class="live-door-card" data-join="${person.id}">
            <span class="live-door-avatar">${avatar(person)}</span>
            <strong>${person.first}</strong>
          </button>
        `).join("")}
      </div>
      <div class="section-heading">
        <div><p class="eyebrow">Conversations</p><h2>Pick up where you left off</h2></div>
        <button data-action="new-chat">New</button>
      </div>
      <div class="chat-list">
        ${[
          ["zuri", "That bridge at 2:41 changed the whole record.", "2m", true],
          ["raj", "I saved the album for our next Tether.", "18m", true],
          ["mary", "Your capsule landed at exactly the right time.", "1h", false],
          ["kevin", "Grace tonight?", "Yesterday", false],
        ].map(([id, copy, time, unread]) => {
          const person = personById(id);
          return `<button class="chat-row" data-chat="${id}">
            ${avatar(person)}
            <span class="chat-copy"><strong>${person.name}</strong><span>${copy}</span></span>
            <span class="chat-meta"><time>${time}</time>${unread ? "<i></i>" : ""}</span>
          </button>`;
        }).join("")}
      </div>
      <article class="dating-entry">
        <div class="dating-entry-copy">
          <p class="eyebrow">Music-first Dating</p>
          <h3>Attraction with evidence.</h3>
          <p>Cards, a fast local grid, and songs instead of cold DMs.</p>
          <button class="button rose" data-mode="dating">Enter Dating</button>
        </div>
        <div class="dating-entry-portraits">${avatar(PEOPLE[2])}${avatar(PEOPLE[3])}</div>
      </article>`;
  }

  function renderDating() {
    const candidates = PEOPLE.filter(person => ["zuri", "aaliyah", "hiroshi", "raj"].includes(person.id));
    const candidate = candidates[state.dating.index % candidates.length];
    const tab = state.dating.tab;
    return `<div class="dating-shell">
      <div class="dating-topline">
        <span class="live-pill">${state.dating.discoverable ? "Visible" : "Preview mode"}</span>
        <button class="text-button" data-action="${state.dating.enabled ? "dating-settings" : "dating-setup"}">${state.dating.enabled ? "Preferences" : "Turn on Dating"}</button>
      </div>
      <div class="segment-tabs dating-tabs" role="tablist" aria-label="Dating sections">
        ${[
          ["deck", "Deck"],
          ["grid", "Grid"],
          ["signals", `Signals ${state.dating.signals.length}`],
        ].map(([id, label]) => `<button class="${tab === id ? "active" : ""}" data-dating-tab="${id}" role="tab" aria-selected="${tab === id}">${label}</button>`).join("")}
      </div>
      ${tab === "deck" ? renderDatingDeck(candidate) : tab === "grid" ? renderDatingGrid(candidates) : renderSignals()}`;
  }

  function renderDatingDeck(person) {
    const canUndo = state.dating.passed.length > 0;
    return `<div class="dating-toolbar">
      <span><strong>Discover</strong><small>Mutual fit + music evidence</small></span>
      <button class="text-button" data-action="dating-filters">Filters · free</button>
    </div>
    <article class="dating-card" data-dating-profile="${person.id}">
      ${avatar(person, "dating-photo")}
      <div class="dating-photo-scrim"></div>
      <div class="photo-dots"><i class="active"></i><i></i><i></i></div>
      <div class="dating-card-top"><span class="band-pill">${person.band}</span>${person.status === "live" ? '<span class="live-pill">Online now</span>' : ""}</div>
      <div class="dating-card-copy">
        <h2>${person.first}, ${person.age}</h2>
        <p>${person.pronouns} · ${person.intent}</p>
        <div class="dating-card-meta"><span class="chip">${person.structure}</span><span class="chip">${person.community}</span></div>
        <p>${person.bio}</p>
        <button class="anthem-row" data-signal="${person.id}">
          <span class="anthem-icon">${ICONS.signal}</span>
          <span class="anthem-copy"><small>Their anthem</small><strong>${person.anthem.title} · ${person.anthem.artist}</strong></span>
          ${ICONS.play}
        </button>
      </div>
    </article>
    <div class="dating-actions">
      <button class="dating-action" data-date-action="pass" data-person="${person.id}">${ICONS.pass}<span>Pass</span></button>
      <button class="dating-action signal" data-signal="${person.id}">${ICONS.signal}<span>Signal</span></button>
      <button class="dating-action like" data-date-action="like" data-person="${person.id}">${ICONS.heart}<span>Like</span></button>
    </div>
    <button class="undo-chip" data-date-action="undo" ${canUndo ? "" : "disabled"}>Undo last pass</button>`;
  }

  function renderDatingGrid(candidates) {
    return `<div class="dating-toolbar"><span><strong>People in your bands</strong><small>Never ordered by exact distance</small></span><button class="text-button" data-action="dating-filters">Bands</button></div>
      <div class="dating-grid">${candidates.map(person => `
        <button class="dating-grid-card" data-dating-profile="${person.id}">
          ${avatar(person)}
          <span class="dating-grid-copy"><strong>${person.first}, ${person.age}</strong><span>${person.band} · ${person.intent}</span></span>
        </button>`).join("")}
      </div>`;
  }

  function renderSignals() {
    const signalPeople = state.dating.signals.map(personById);
    if (!signalPeople.length) return `<div class="empty-state"><img src="brand/tether-mark.svg" alt=""><h3>No new Signals</h3><p>When someone sends a song, it will arrive here with the reason they chose it.</p><button class="button rose" data-dating-tab="deck">Discover people</button></div>`;
    return `<div class="dating-toolbar"><span><strong>Songs sent with intent</strong><small>No cold DMs</small></span></div>
      <div class="signal-list">${signalPeople.map(person => `
        <article class="signal-card">
          ${avatar(person)}
          <div class="signal-copy"><strong>${person.name}</strong><span class="signal-song">${person.anthem.title} · ${person.anthem.artist}</span><p>“This made me think of the way you described late-night records.”</p>
            <div class="signal-actions"><button data-signal-respond="${person.id}">Respond</button><button data-profile="${person.id}">Profile</button></div>
          </div>
        </article>`).join("")}
      </div>`;
  }

  function renderYou() {
    const artists = [
      ["Jeff Buckley", "#477b9c", "#c5a178"],
      ["Radiohead", "#a85b72", "#354d7c"],
      ["Japanese Breakfast", "#e3b73c", "#d1654d"],
      ["Frank Ocean", "#78a06e", "#ead9bb"],
      ["Bon Iver", "#909a83", "#c9bca1"],
    ];
    const records = [TRACKS.grace, TRACKS.weirdFishes, TRACKS.jubilee, TRACKS.blonde, TRACKS.bonIver];
    $("#you-view").innerHTML = `
      <section class="you-hero">
        <img src="${state.account.photo}" alt="">
        <div class="you-hero-actions">
          <button data-action="${state.account.claimed ? "edit-profile" : "claim"}" aria-label="${state.account.claimed ? "Edit profile" : "Claim profile"}">${state.account.claimed ? ICONS.gear : ICONS.heart}</button>
          <button data-action="profile-menu" aria-label="Profile menu">${ICONS.more}</button>
        </div>
        <div class="you-hero-content">
          <p class="eyebrow">${state.account.claimed ? "Your music identity" : "A profile worth claiming"}</p>
          <h1>${escapeHTML(state.account.displayName)}</h1>
          <p class="handle">@${escapeHTML(state.account.handle)} · ${escapeHTML(state.account.city)}</p>
          <p class="bio">${escapeHTML(state.account.bio)}</p>
          <div class="taste-chips">${state.profile.chips.map(chip => `<span class="chip">${escapeHTML(chip)}</span>`).join("")}</div>
        </div>
      </section>

      <section class="profile-section">
        <div class="section-heading"><div><p class="eyebrow">Musical interior</p><h2>Artists that feel like home</h2></div><button data-action="edit-taste">Edit</button></div>
        <div class="artist-shelf">
          ${artists.map(([name, a, b], index) => `<article class="artist-tile"><div class="artist-image" style="--artist-a:${a};--artist-b:${b}"></div><strong>${name}</strong><span>${index < 2 ? "Platinum" : "In rotation"}</span></article>`).join("")}
        </div>
      </section>

      <section class="profile-section">
        <div class="section-heading"><div><p class="eyebrow">Favorite records</p><h2>The shelf</h2></div></div>
        <div class="record-shelf">
          ${records.map(track => `<article class="record-tile">${coverHTML(track)}<strong>${track.album}</strong><span>${track.artist}</span></article>`).join("")}
        </div>
      </section>

      <section class="profile-section">
        <div class="section-heading"><div><p class="eyebrow">Latest expression</p><h2>What the music meant</h2></div><button data-nav-jump="exchange">All reviews</button></div>
        <article class="latest-expression">
          <p class="eyebrow">Grace · Jeff Buckley</p>
          <blockquote class="review-pullquote">“The voice is spectacular, but the silences are what make the record intimate.”</blockquote>
          ${ratingHTML("6.0")}
          <footer>Published yesterday · 12 replies</footer>
        </article>
      </section>

      <section class="profile-section">
        <div class="section-heading"><div><p class="eyebrow">Shared history</p><h2>Memories</h2></div><button data-action="all-memories">See all</button></div>
        <div class="memory-timeline">
          <article class="memory-item"><span class="memory-mark"><img src="brand/tether-mark.svg" alt=""></span><div class="memory-copy"><time>JUL 18 · 1:14 AM</time><h3>You + Zuri · Eusexua</h3><p>Forty-five minutes together. You both sent a Pulse when the bridge opened.</p></div></article>
          <article class="memory-item"><span class="memory-mark"><img src="brand/tether-mark.svg" alt=""></span><div class="memory-copy"><time>JUL 11 · 11:42 PM</time><h3>Capsule from Raj</h3><p>“For the walk home when the city finally gets quiet.”</p></div></article>
          <article class="memory-item"><span class="memory-mark"><img src="brand/tether-mark.svg" alt=""></span><div class="memory-copy"><time>JUN 29 · 9:08 PM</time><h3>You + Kevin · Grace</h3><p>Your first full-album Tether became a saved memory.</p></div></article>
        </div>
      </section>`;
  }

  function navigate(view) {
    state.ui.view = view;
    save();
    syncShell();
    $("#app-content")?.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function showToast(message) {
    const toast = $("#toast");
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function setOverlay(html, name = "dialog") {
    overlay = name;
    $("#overlay-root").innerHTML = html;
    document.body.style.overflow = "hidden";
  }

  function closeOverlay() {
    overlay = null;
    $("#overlay-root").innerHTML = "";
    document.body.style.overflow = "";
    stopSession();
  }

  function sheetHTML(kicker, title, body, wide = false) {
    return `<div class="sheet-backdrop" data-action="close-sheet"><section class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}" data-sheet>
      <header class="sheet-head"><div><p class="eyebrow">${escapeHTML(kicker)}</p><h2>${escapeHTML(title)}</h2></div><button data-action="close" aria-label="Close">${ICONS.close}</button></header>
      ${body}
    </section></div>`;
  }

  function openAbout() {
    setOverlay(sheetHTML("A living product demo", "Tether is about shared presence.", `
      <p>Browse seeded people, culture, and music freely. The demo keeps your choices on this device and labels the moments that would connect to a real provider.</p>
      <div class="profile-section">
        <div class="stat-sheet">
          <div class="stat-row"><dt>Violet</dt><dd>Relationship and Tether identity</dd></div>
          <div class="stat-row"><dt>Teal</dt><dd>Live, available, synchronized</dd></div>
          <div class="stat-row"><dt>Amber</dt><dd>Knocks and waiting</dd></div>
          <div class="stat-row"><dt>Rose</dt><dd>Dating intent only</dd></div>
        </div>
      </div>
      <button class="button primary" data-action="close">Keep exploring</button>`), "about");
  }

  function openCreate() {
    setOverlay(sheetHTML("Create", "Start with the music.", `
      <div class="choice-grid">
        <button class="choice-card" data-create-kind="review"><i>${ICONS.star}</i><span><strong>Write a review</strong><small>Record what an album, track, or artist meant.</small></span>${ICONS.chevron}</button>
        <button class="choice-card" data-create-kind="list"><i>${ICONS.save}</i><span><strong>Build a list</strong><small>Curate records around a feeling or idea.</small></span>${ICONS.chevron}</button>
        <button class="choice-card" data-create-kind="capsule"><i>${ICONS.signal}</i><span><strong>Leave a capsule</strong><small>Save a song for someone at the right moment.</small></span>${ICONS.chevron}</button>
      </div>`), "create");
  }

  function openReviewComposer() {
    setOverlay(sheetHTML("New review", "What did the music do?", `
      <label class="field"><span>Music</span><select><option>Grace — Jeff Buckley</option><option>Imaginal Disk — Magdalena Bay</option><option>Eusexua — FKA twigs</option></select></label>
      <label class="field"><span>Your rating</span><select><option>5.0 — Exceptional</option><option>4.5 — Loved it</option><option>4.0 — Strong</option><option>6.0 — Platinum</option></select></label>
      <label class="field"><span>Your words</span><textarea placeholder="Write the sentence only you could write…"></textarea></label>
      <div class="sheet-actions"><button class="button ghost" data-action="close">Save draft</button><button class="button primary" data-submit-review>Publish</button></div>`), "review");
  }

  function openProfile(id, context = "social") {
    const person = personById(id);
    const dating = context === "dating";
    setOverlay(`<article class="overlay profile-overlay" role="dialog" aria-modal="true" aria-label="${person.name}'s profile">
      <button class="overlay-close" data-action="close" aria-label="Close profile">${ICONS.back}</button>
      <header class="public-hero">
        ${avatar(person)}
        <div class="public-hero-copy">
          <div class="public-hero-meta">${person.status === "open" || person.status === "live" ? '<span class="live-pill">Listening now</span>' : ""}<span class="band-pill">${person.band}</span></div>
          <h1>${person.name}${dating ? `, ${person.age}` : ""}</h1>
          <p>${person.pronouns} · ${person.handle}</p>
          <p>${person.bio}</p>
        </div>
      </header>
      <div class="profile-story">
        <section class="profile-section">
          <article class="live-moment">
            ${coverHTML(person.track)}
            <div class="live-moment-copy"><p class="eyebrow">Listening now</p><h3>${person.track.title}</h3><p>${person.track.artist}</p><button class="button sync" data-join="${person.id}">${person.status === "knock" ? "Knock first" : "Join now"}</button></div>
          </article>
        </section>
        <section class="profile-section">
          <article class="evidence-block"><p class="eyebrow">Why you might connect</p><h3>${person.evidence}</h3><p>This is based on music and communities—not a synthetic match percentage.</p></article>
        </section>
        <section class="profile-section">
          <div class="section-heading"><div><p class="eyebrow">Taste</p><h2>Their musical interior</h2></div></div>
          <div class="artist-shelf">${person.artists.map((artist, index) => `<article class="artist-tile"><div class="artist-image" style="--artist-a:${[person.track.a, person.anthem.a, "#8b7cff"][index]};--artist-b:${[person.track.b, person.anthem.b, "#f5b04c"][index]}"></div><strong>${artist}</strong><span>${index === 0 ? "Always returns" : "In rotation"}</span></article>`).join("")}</div>
          <button class="anthem-row" data-signal="${person.id}"><span class="anthem-icon">${ICONS.play}</span><span class="anthem-copy"><small>Their anthem</small><strong>${person.anthem.title} · ${person.anthem.artist}</strong></span>${ICONS.signal}</button>
        </section>
        <section class="profile-section">
          <div class="section-heading"><div><p class="eyebrow">In their words</p><h2>Latest review</h2></div></div>
          <article class="latest-expression"><blockquote class="review-pullquote">“${person.review}”</blockquote><footer>${person.anthem.album} · yesterday</footer></article>
        </section>
        ${dating ? `<section class="profile-section"><div class="section-heading"><div><p class="eyebrow">At a glance</p><h2>The useful details</h2></div></div><dl class="stat-sheet">
          <div class="stat-row"><dt>Looking for</dt><dd>${person.intent}</dd></div>
          <div class="stat-row"><dt>Structure</dt><dd>${person.structure}</dd></div>
          <div class="stat-row"><dt>Area</dt><dd>${person.band}</dd></div>
          <div class="stat-row"><dt>Community</dt><dd>${person.community}</dd></div>
        </dl></section>` : ""}
      </div>
      <div class="sticky-actions ${dating ? "triple" : ""}">
        ${dating ? `<button class="button ghost" data-date-action="pass" data-person="${person.id}">Pass</button><button class="button rose" data-signal="${person.id}">Send a song</button><button class="button secondary" data-date-action="like" data-person="${person.id}">Like</button>` : `<button class="button secondary" data-chat="${person.id}">Message</button><button class="button primary" data-join="${person.id}">Listen together</button>`}
      </div>
    </article>`, "profile");
  }

  function openChat(id) {
    const person = personById(id);
    setOverlay(`<div class="sheet-backdrop"><section class="sheet chat-sheet" role="dialog" aria-modal="true" aria-label="Conversation with ${person.name}">
      <header class="sheet-head"><div class="chat-person">${avatar(person)}<span><strong>${person.name}</strong><small>${person.status === "offline" ? "Last active today" : `Listening to ${person.track.title}`}</small></span></div><button data-action="close" aria-label="Close">${ICONS.close}</button></header>
      <button class="button primary" data-join="${person.id}">${ICONS.join} Listen together</button>
      <div class="thread">
        <div class="bubble">This made me think of the way you described late-night records.</div>
        <div class="bubble"><div class="song-message">${coverHTML(person.anthem)}<span><strong>${person.anthem.title}</strong><small>${person.anthem.artist}</small></span></div></div>
        <div class="bubble mine">You picked the exact right song.</div>
        <div class="bubble">Save the rest of the album for tonight?</div>
      </div>
      <form class="chat-compose" data-chat-form><input aria-label="Message" placeholder="Message ${person.first}…" autocomplete="off"><button type="submit">Send</button></form>
    </section></div>`, "chat");
  }

  function openSignal(id) {
    const person = personById(id);
    setOverlay(sheetHTML("A musical opening", `Send ${person.first} a Signal.`, `
      <p>Choose one song and say why. It arrives privately and counts as your expression of interest.</p>
      <label class="field"><span>Song</span><select><option>Grace — Jeff Buckley</option><option>Weird Fishes — Radiohead</option><option>Paprika — Japanese Breakfast</option></select></label>
      <label class="field"><span>Your note</span><textarea maxlength="160" placeholder="This made me think of…"></textarea></label>
      <p style="font-size:12px">Conversation opens only after mutual interest.</p>
      <div class="sheet-actions"><button class="button ghost" data-action="close">Cancel</button><button class="button rose" data-send-signal="${person.id}">Send Signal</button></div>`), "signal");
  }

  function openDatingSettings(setup = false) {
    setOverlay(sheetHTML(setup ? "Explicit opt-in" : "Dating preferences", setup ? "Turn on Dating when you're ready." : "Your Dating controls", `
      <p>${setup ? "Dating uses your music identity, but it never turns on automatically. You control who can see you and what each field reveals." : "Pause visibility, adjust your bands, or change what people can learn."}</p>
      <div class="choice-grid" style="margin-top:16px">
        <button class="choice-card active" data-dating-choice="intent"><i>${ICONS.heart}</i><span><strong>Long-term · slow burn</strong><small>Your relationship intention</small></span>${ICONS.chevron}</button>
        <button class="choice-card active" data-dating-choice="band"><i>${ICONS.signal}</i><span><strong>Nearby + Around Philly</strong><small>People see a band, never your location</small></span>${ICONS.chevron}</button>
        <button class="choice-card" data-dating-choice="visibility"><i>${ICONS.save}</i><span><strong>${state.dating.discoverable ? "Visible now" : "Profile paused"}</strong><small>Change this at any time</small></span>${ICONS.chevron}</button>
      </div>
      <div class="sheet-actions"><button class="button ghost" data-action="close">Not now</button><button class="button rose" data-enable-dating>${setup ? "Turn on Dating" : "Save changes"}</button></div>`), "dating-settings");
  }

  function openFilters() {
    setOverlay(sheetHTML("Discovery bands", "People see the band, never your location.", `
      <div class="choice-grid">
        <button class="choice-card active"><i>1</i><span><strong>Nearby</strong><small>Your closest broad band</small></span></button>
        <button class="choice-card active"><i>2</i><span><strong>Around Philly</strong><small>The city and immediate area</small></span></button>
        <button class="choice-card"><i>3</i><span><strong>Greater region</strong><small>Wider metro area</small></span></button>
      </div>
      <div class="sheet-actions"><button class="button rose" data-action="close">Apply bands</button></div>`), "filters");
  }

  function openSession(personId = null) {
    const person = personId ? personById(personId) : null;
    const track = person?.track || TRACKS.nightTransit;
    state.session.active = true;
    state.session.personId = personId;
    save();
    sessionSeconds = 0;
    setOverlay(`<section class="stage" role="dialog" aria-modal="true" aria-label="Shared listening session" style="--stage-a:${track.a};--stage-b:${track.b}">
      <div class="stage-background"></div>
      <div class="stage-ui">
        <header class="stage-top"><button data-action="close-stage" aria-label="Leave session">${ICONS.back}</button><div class="stage-live"><strong>${person ? `You + ${person.first}` : "Your Stage is live"}</strong><span data-stage-time>0:00</span></div></header>
        <div class="listener-orbit">${person ? avatar(person) : ""}<img src="${state.account.photo}" alt=""></div>
        ${coverHTML(track, "stage-art")}
        <div class="stage-track"><h1>${track.title}</h1><p>${track.artist} · ${track.album}</p></div>
        <div class="stage-progress"><div class="stage-progress-bar"><i></i></div><div class="stage-time"><span>1:18</span><span>-2:48</span></div><p class="sync-line">synced within 73 ms</p></div>
        <div class="stage-controls"><button data-action="pause">Pause</button><button data-action="next">Next track</button><button data-action="manage-stage">Manage</button></div>
        <div class="pulse-zone">
          <button class="pulse-button" data-pulse ${person ? "" : "disabled"} aria-label="Send a Pulse; hold for 1.5 seconds"><span class="pulse-charge"></span><img src="brand/tether-mark.svg" alt=""></button>
          <p class="pulse-label" data-pulse-label>${person ? "Hold to send a Pulse" : "Pulse unlocks when someone joins"}</p>
          <p class="pulse-note" data-pulse-note>${person ? "" : "Friends with an Open Door can join this moment."}</p>
        </div>
      </div>
    </section>`, "stage");
    clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
      sessionSeconds += 1;
      const node = $("[data-stage-time]");
      if (node) node.textContent = `${Math.floor(sessionSeconds / 60)}:${String(sessionSeconds % 60).padStart(2, "0")}`;
      if (!person && sessionSeconds === 5) {
        const guest = personById("raj");
        $(".listener-orbit")?.insertAdjacentHTML("afterbegin", avatar(guest));
        const pulse = $("[data-pulse]");
        if (pulse) pulse.disabled = false;
        const label = $("[data-pulse-label]");
        if (label) label.textContent = "Hold to send a Pulse";
        const note = $("[data-pulse-note]");
        if (note) note.textContent = `${guest.name} joined your Stage`;
      }
    }, 1000);
  }

  function stopSession() {
    clearInterval(sessionTimer);
    clearTimeout(pulseTimer);
    sessionTimer = 0;
    state.session.active = false;
    save();
  }

  function startPulse(button) {
    if (!button || button.disabled || pulseTimer) return;
    pulseReady = false;
    button.classList.add("charging");
    const label = $("[data-pulse-label]");
    if (label) label.textContent = "Keep holding — let it build";
    pulseTimer = setTimeout(() => {
      pulseReady = true;
      button.classList.add("ready");
      if (label) label.textContent = "Release — send it";
    }, 1500);
  }

  function releasePulse(button) {
    if (!button || !pulseTimer) return;
    clearTimeout(pulseTimer);
    pulseTimer = 0;
    button.classList.remove("charging", "ready");
    if (pulseReady) {
      const stage = $(".stage");
      stage?.classList.remove("pulse-fired");
      void stage?.offsetWidth;
      stage?.classList.add("pulse-fired");
      const person = state.session.personId ? personById(state.session.personId) : personById("raj");
      const label = $("[data-pulse-label]");
      const note = $("[data-pulse-note]");
      if (label) label.textContent = "Pulse sent";
      if (note) note.textContent = `${person.first} felt your Pulse`;
      state.session.pulses += 1;
      save();
      setTimeout(() => {
        stage?.classList.remove("pulse-fired");
        if (label) label.textContent = "Hold to send a Pulse";
      }, 1500);
    } else {
      const label = $("[data-pulse-label]");
      if (label) label.textContent = "Hold to send a Pulse";
    }
    pulseReady = false;
  }

  function openOnboarding() {
    setupStep = 0;
    setupDraft = { ...state.account, intent: "friends" };
    renderOnboarding();
  }

  function renderOnboarding() {
    const steps = [
      {
        kicker: "Make it yours",
        title: "What should people call you?",
        body: `<label class="field"><span>Your name</span><input name="displayName" value="${escapeHTML(setupDraft.displayName)}" autocomplete="name" placeholder="Alex Rivera"></label>`,
      },
      {
        kicker: "Your place",
        title: "Where does your listening live?",
        body: `<label class="field"><span>City</span><input name="city" value="${escapeHTML(setupDraft.city)}" autocomplete="address-level2" placeholder="Philadelphia"></label><p>People see a broad city or band—never your exact location.</p>`,
      },
      {
        kicker: "Your face in the room",
        title: "Choose a profile portrait.",
        body: `<div class="dating-grid">${["realjohn.svg", "x_joseph_x.svg", "x_christopher_x.svg", "realwilliam.svg"].map(file => `<button class="dating-grid-card ${setupDraft.photo.endsWith(file) ? "selected" : ""}" data-setup-photo="avatars/${file}"><img src="avatars/${file}" alt=""><span class="dating-grid-copy"><strong>${setupDraft.photo.endsWith(file) ? "Selected" : "Choose"}</strong></span></button>`).join("")}</div>`,
      },
      {
        kicker: "Your intention",
        title: "What brings you to Tether?",
        body: `<div class="choice-grid">
          <button class="choice-card ${setupDraft.intent === "friends" ? "active" : ""}" data-setup-intent="friends"><i>${ICONS.message}</i><span><strong>Friends</strong><small>People, communities, and shared listening</small></span></button>
          <button class="choice-card ${setupDraft.intent === "dating" ? "active" : ""}" data-setup-intent="dating"><i>${ICONS.heart}</i><span><strong>Dating</strong><small>Music-first discovery with explicit opt-in</small></span></button>
          <button class="choice-card ${setupDraft.intent === "both" ? "active" : ""}" data-setup-intent="both"><i>${ICONS.signal}</i><span><strong>Both</strong><small>Keep the worlds separate; move between them</small></span></button>
        </div>`,
      },
      {
        kicker: "Connect your music",
        title: "Let your listening speak first.",
        body: `<article class="evidence-block"><p class="eyebrow">Spotify demo connection</p><h3>173 preloaded tracks become your starting identity.</h3><p>This browser demo simulates provider authorization. It does not contact Spotify or publish account data.</p></article><div class="taste-chips"><span class="chip">Jeff Buckley</span><span class="chip">Radiohead</span><span class="chip">Japanese Breakfast</span></div>`,
      },
    ];
    const step = steps[setupStep];
    setOverlay(`<div class="sheet-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-label="${step.title}">
      <div class="progress-bar"><i style="width:${((setupStep + 1) / steps.length) * 100}%"></i></div>
      <header class="sheet-head"><div><p class="eyebrow">${step.kicker}</p><h2>${step.title}</h2></div><button data-action="close" aria-label="Close">${ICONS.close}</button></header>
      ${step.body}
      <div class="sheet-actions">${setupStep ? '<button class="button ghost" data-setup-back>Back</button>' : ""}<button class="button primary" data-setup-next>${setupStep === steps.length - 1 ? "Claim my Tether" : "Continue"}</button></div>
    </section></div>`, "onboarding");
  }

  function advanceOnboarding() {
    const name = $('[name="displayName"]')?.value.trim();
    const city = $('[name="city"]')?.value.trim();
    if (name) setupDraft.displayName = name;
    if (city) setupDraft.city = city;
    if (setupStep < 4) {
      setupStep += 1;
      renderOnboarding();
      return;
    }
    state.account = { ...state.account, ...setupDraft, claimed: true };
    if (setupDraft.intent === "dating" || setupDraft.intent === "both") state.dating.enabled = true;
    save();
    closeOverlay();
    render();
    navigate("you");
    showToast("Your Tether is ready.");
  }

  function nextDatingCandidate(action, id) {
    const list = action === "pass" ? state.dating.passed : state.dating.liked;
    if (!list.includes(id)) list.push(id);
    state.dating.index += 1;
    save();
    renderPeople();
    showToast(action === "pass" ? "Passed. Undo is available." : "Interest saved privately.");
  }

  function handleClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.nav) return navigate(button.dataset.nav);
    if (button.dataset.navJump) return navigate(button.dataset.navJump);
    if (button.dataset.mode) {
      state.ui.peopleMode = button.dataset.mode;
      if (button.dataset.mode === "dating") state.ui.view = "people";
      save();
      renderPeople();
      syncShell();
      return;
    }
    if (button.dataset.feed) {
      state.culture.feed = button.dataset.feed;
      save();
      renderExchange();
      return;
    }
    if (button.dataset.datingTab) {
      state.dating.tab = button.dataset.datingTab;
      save();
      renderPeople();
      return;
    }
    if (button.dataset.profile) return openProfile(button.dataset.profile);
    if (button.dataset.datingProfile) return openProfile(button.dataset.datingProfile, "dating");
    if (button.dataset.chat) return openChat(button.dataset.chat);
    if (button.dataset.join) return openSession(button.dataset.join);
    if (button.dataset.signal) return openSignal(button.dataset.signal);
    if (button.dataset.sendSignal) {
      closeOverlay();
      showToast(`Signal sent to ${personById(button.dataset.sendSignal).first}.`);
      return;
    }
    if (button.dataset.signalRespond) {
      closeOverlay();
      openChat(button.dataset.signalRespond);
      return;
    }
    if (button.dataset.save) {
      const id = button.dataset.save;
      state.culture.saved = state.culture.saved.includes(id) ? state.culture.saved.filter(item => item !== id) : [...state.culture.saved, id];
      save();
      renderExchange();
      showToast(state.culture.saved.includes(id) ? "Saved to your profile." : "Removed from saved.");
      return;
    }
    if (button.dataset.rate) {
      state.culture.ratings[button.dataset.rate] = state.culture.ratings[button.dataset.rate] ? null : "4.5";
      save();
      renderExchange();
      showToast(state.culture.ratings[button.dataset.rate] ? "Your rating is 4.5." : "Rating removed.");
      return;
    }
    if (button.dataset.dateAction) {
      const action = button.dataset.dateAction;
      if (action === "undo") {
        const restored = state.dating.passed.pop();
        if (restored) state.dating.index = Math.max(0, state.dating.index - 1);
        save();
        renderPeople();
        showToast(restored ? "Last pass restored." : "Nothing to undo.");
      } else {
        if (overlay === "profile") closeOverlay();
        nextDatingCandidate(action, button.dataset.person);
      }
      return;
    }
    if (button.dataset.createKind === "review") return openReviewComposer();
    if (button.dataset.createKind) {
      closeOverlay();
      showToast(`${button.dataset.createKind === "list" ? "List" : "Capsule"} draft opened.`);
      return;
    }
    if (button.dataset.submitReview !== undefined) {
      closeOverlay();
      showToast("Review published to Exchange.");
      return;
    }
    if (button.dataset.enableDating !== undefined) {
      state.dating.enabled = true;
      state.dating.discoverable = true;
      save();
      closeOverlay();
      renderPeople();
      showToast("Dating is on. You control visibility.");
      return;
    }
    if (button.dataset.setupPhoto) {
      setupDraft.photo = button.dataset.setupPhoto;
      renderOnboarding();
      return;
    }
    if (button.dataset.setupIntent) {
      setupDraft.intent = button.dataset.setupIntent;
      renderOnboarding();
      return;
    }
    if (button.dataset.setupNext !== undefined) return advanceOnboarding();
    if (button.dataset.setupBack !== undefined) {
      setupStep = Math.max(0, setupStep - 1);
      renderOnboarding();
      return;
    }

    switch (button.dataset.action) {
      case "about": openAbout(); break;
      case "create": openCreate(); break;
      case "inbox": navigate("people"); break;
      case "self": state.account.claimed ? navigate("you") : openOnboarding(); break;
      case "claim": openOnboarding(); break;
      case "open-session": openSession(); break;
      case "close":
      case "close-stage": closeOverlay(); break;
      case "close-sheet":
        if (event.target === button) closeOverlay();
        break;
      case "knocks": navigate("people"); showToast("Two live invitations moved to People."); break;
      case "new-chat": showToast("Choose a person to start a conversation."); break;
      case "dating-setup": openDatingSettings(true); break;
      case "dating-settings": openDatingSettings(false); break;
      case "dating-filters": openFilters(); break;
      case "edit-profile":
      case "edit-taste":
      case "profile-menu": openOnboarding(); break;
      case "all-memories": showToast("All memories are kept in chronological order."); break;
      case "pause": showToast("Playback paused for everyone."); break;
      case "next": showToast("The next track will begin together."); break;
      case "manage-stage": showToast("Stage controls opened."); break;
      default: break;
    }
  }

  function handleChange(event) {
    if (event.target.matches("[data-privacy]")) {
      state.session.privacy = event.target.value;
      save();
      renderListen();
      showToast(event.target.value === "open" ? "Open Door — friends join instantly." : event.target.value === "knock" ? "Knock First — you approve every join." : "Ghost — listening stays private.");
    }
  }

  function handleSubmit(event) {
    if (!event.target.matches("[data-chat-form]")) return;
    event.preventDefault();
    const input = $("input", event.target);
    if (!input?.value.trim()) return;
    const thread = $(".thread", event.target.closest(".chat-sheet"));
    thread?.insertAdjacentHTML("beforeend", `<div class="bubble mine">${escapeHTML(input.value.trim())}</div>`);
    input.value = "";
    thread?.scrollTo?.({ top: thread.scrollHeight, behavior: "smooth" });
  }

  function install() {
    render();
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("pointerdown", event => {
      const button = event.target.closest("[data-pulse]");
      if (button) startPulse(button);
    });
    document.addEventListener("pointerup", event => {
      const button = event.target.closest("[data-pulse]") || $("[data-pulse].charging");
      if (button) releasePulse(button);
    });
    document.addEventListener("pointercancel", event => {
      const button = event.target.closest("[data-pulse]") || $("[data-pulse].charging");
      if (button) releasePulse(button);
    });
    document.addEventListener("keydown", event => {
      if ((event.key === " " || event.key === "Enter") && event.target.matches("[data-pulse]")) startPulse(event.target);
    });
    document.addEventListener("keyup", event => {
      if ((event.key === " " || event.key === "Enter") && event.target.matches("[data-pulse]")) releasePulse(event.target);
    });
    if (!state.account.claimed) setTimeout(() => showToast("Browse freely. Claim your profile when you're ready."), 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
