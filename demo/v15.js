(() => {
  "use strict";

  const STORE_KEY = "tether.v2";

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

  let PEOPLE = [
    {
      id: "raj",
      name: "Raj Santos",
      first: "Raj",
      age: 25,
      pronouns: "he/him",
      handle: "@raj.afterhours",
      avatar: "media/raj-editorial.webp",
      city: "Around Philly",
      band: "Nearby",
      status: "open",
      track: TRACKS.borrowedTime,
      bio: "Basement shows, patient album listens, and walking home after the encore.",
      artists: ["Tyler, The Creator", "Radiohead", "Aminé"],
      intent: "Dating and friends",
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
      avatar: "media/mary-editorial.webp",
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
      avatar: "media/zuri-editorial.webp",
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
      avatar: "media/aaliyah-editorial.webp",
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
      avatar: "media/hiroshi-editorial.webp",
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
      avatar: "media/kevin-editorial.webp",
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
      photo: "media/alex-editorial.webp",
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
      passed: [],
      saved: [],
      liked: [],
      history: [],
      matches: [],
      signals: ["zuri", "aaliyah"],
      profile: {
        meet: "Women and nonbinary people",
        intent: "Long-term · slow burn",
        structure: "Monogamous",
        anthem: "Grace — Jeff Buckley",
        prompt: "The song I wish I could hear again for the first time",
        answer: "Weird Fishes / Arpeggi, on a night walk with nowhere to be.",
        photos: ["media/alex-editorial.webp"],
        visibility: {
          age: "Public",
          intent: "Public",
          structure: "After match",
          city: "Filter only",
        },
      },
    },
    culture: { feed: "for-you", saved: [], ratings: {}, posts: [], replies: {} },
    session: { privacy: "open", active: false, personId: null, pulses: 0 },
    memories: [
      { id: "memory-zuri", personId: "zuri", track: "Eusexua", artist: "FKA twigs", seconds: 2700, pulses: 2, date: "JUL 18 · 1:14 AM", feeling: "The bridge made the whole room feel weightless." },
      { id: "memory-raj", personId: "raj", track: "Borrowed Time", artist: "Aminé", seconds: 1680, pulses: 0, date: "JUL 11 · 11:42 PM", feeling: "For the walk home when the city finally got quiet." },
      { id: "memory-kevin", personId: "kevin", track: "Grace", artist: "Jeff Buckley", seconds: 2520, pulses: 1, date: "JUN 29 · 9:08 PM", feeling: "Our first full-album Tether." },
    ],
    knocks: [
      { id: "knock-zuri", personId: "zuri", kind: "knock", status: "pending" },
      { id: "invite-aaliyah", personId: "aaliyah", kind: "invite", status: "pending" },
    ],
    conversations: {
      zuri: { unread: true, time: "2m", messages: [
        { mine: false, text: "That bridge at 2:41 changed the whole record." },
      ] },
      raj: { unread: true, time: "18m", messages: [
        { mine: false, text: "I saved the album for our next Tether." },
      ] },
      mary: { unread: false, time: "1h", messages: [
        { mine: false, text: "Your capsule landed at exactly the right time." },
      ] },
      kevin: { unread: false, time: "Yesterday", messages: [
        { mine: false, text: "Grace tonight?" },
      ] },
    },
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
        dating: {
          ...DEFAULT_STATE.dating,
          ...saved.dating,
          profile: {
            ...DEFAULT_STATE.dating.profile,
            ...saved.dating?.profile,
            visibility: {
              ...DEFAULT_STATE.dating.profile.visibility,
              ...saved.dating?.profile?.visibility,
            },
          },
        },
        culture: { ...DEFAULT_STATE.culture, ...saved.culture },
        session: { ...DEFAULT_STATE.session, ...saved.session, active: false },
        memories: Array.isArray(saved.memories) ? saved.memories : clone(DEFAULT_STATE.memories),
        knocks: Array.isArray(saved.knocks) ? saved.knocks : clone(DEFAULT_STATE.knocks),
        conversations: { ...DEFAULT_STATE.conversations, ...saved.conversations },
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
  let datingSetupStep = 0;
  let datingDraft = {};
  let lastFocused = null;
  let lastDragAt = 0;

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function personById(id) {
    if (id === "self") {
      return {
        id: "self",
        name: state.account.displayName,
        first: state.account.displayName.split(" ")[0],
        handle: `@${state.account.handle}`,
        avatar: state.account.photo,
        age: ageFromBirthDate(state.account.birthDate) || 24,
        pronouns: "they/them",
        city: state.account.city,
        band: "Your area",
        status: "offline",
        track: TRACKS.nightTransit,
        bio: state.account.bio,
        artists: state.profile.topArtists.slice(0, 3),
        intent: state.dating.profile.intent,
        structure: state.dating.profile.structure,
        community: "Your Tether",
        evidence: "This is your profile as other people experience it.",
        anthem: TRACKS.grace,
        review: state.culture.posts[0]?.text || "Finding people through the songs that say it first.",
      };
    }
    return PEOPLE.find(person => person.id === id) || PEOPLE[0];
  }

  function ageFromBirthDate(value) {
    if (!value) return 0;
    const birthDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const birthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (today < birthday) age -= 1;
    return age;
  }

  function isAdult() {
    return ageFromBirthDate(state.account.birthDate) >= 18;
  }

  function canUseDating() {
    return state.dating.enabled && isAdult();
  }

  function eligibleForDating(person) {
    return Number(person.age) >= 18 && !String(person.intent).toLowerCase().startsWith("friends");
  }

  function datingCandidates() {
    const decided = new Set([...state.dating.passed, ...state.dating.liked]);
    return PEOPLE
      .filter(person => person.id !== "self" && eligibleForDating(person))
      .filter(person => !decided.has(person.id))
      .slice(0, 18);
  }

  async function loadCityPopulation() {
    if (typeof fetch !== "function") return;
    try {
      const response = await fetch("data/profiles.json");
      if (!response.ok) return;
      const payload = await response.json();
      const featuredHandles = new Set(PEOPLE.map(person => person.handle.replace(/^@/, "")));
      const tracks = Object.values(TRACKS);
      const extras = (payload.profiles || [])
        .filter(profile => !featuredHandles.has(profile.username))
        .map((profile, index) => {
          const track = tracks[index % tracks.length];
          const age = Number(profile.bio?.match(/\b(1[89]|[2-9]\d)\b/)?.[1] || 23 + (index % 6));
          const status = profile.currentTrack ? "open" : profile.privacyMode === "knock-first" ? "knock" : index % 4 === 0 ? "live" : "offline";
          return {
            id: profile.id,
            name: profile.name || profile.displayName || profile.username,
            first: (profile.name || profile.displayName || profile.username).replace(/^@/, "").split(" ")[0],
            age,
            pronouns: index % 3 === 0 ? "she/her" : index % 3 === 1 ? "he/him" : "they/them",
            handle: `@${profile.username}`,
            avatar: profile.avatarUrl,
            city: profile.location?.neighborhood || "Philadelphia",
            band: index % 3 === 0 ? "Nearby" : index % 3 === 1 ? "Around Philly" : "Greater region",
            status,
            track,
            bio: profile.bio?.replace(/^\d+\s*\|\s*[^|]+\|\s*/i, "") || "Finding the city through records and the people inside them.",
            artists: (profile.topArtists || []).slice(0, 3),
            intent: index % 3 === 0 ? "Long-term" : index % 3 === 1 ? "Dating and friends" : "Friends first",
            structure: index % 2 === 0 ? "Monogamous" : "Open to exploring",
            community: (profile.topArtists || ["Philadelphia listeners"])[0],
            evidence: `You both return to ${(profile.topArtists || [track.artist])[0]} and listen beyond the single.`,
            anthem: track,
            review: `The detail that stays with me is how the record keeps changing after the obvious moment passes.`,
          };
        });
      PEOPLE = [...PEOPLE, ...extras];
      render();
    } catch {
      // The featured population remains a complete offline-safe fallback.
    }
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
    return `<img class="${className}" src="${person.avatar}" width="96" height="96" alt="" loading="lazy" decoding="async">`;
  }

  function resizeImage(file, maxEdge = 1280, quality = .84) {
    return new Promise((resolve, reject) => {
      if (!file?.type?.startsWith("image/")) return reject(new Error("Choose an image file."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("That image could not be read."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("That image could not be opened."));
        image.onload = () => {
          const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
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
    const unread = Object.values(state.conversations).filter(conversation => conversation.unread).length;
    const pending = state.knocks.filter(item => item.status === "pending").length;
    const unreadNode = $("[data-unread-count]");
    const peopleNode = $("[data-people-count]");
    if (unreadNode) {
      unreadNode.textContent = unread;
      unreadNode.hidden = unread === 0;
    }
    if (peopleNode) {
      peopleNode.textContent = unread + pending;
      peopleNode.hidden = unread + pending === 0;
    }
  }

  function renderListen() {
    const onAir = PEOPLE.filter(person => person.status === "open" || person.status === "knock").slice(0, 4);
    const pendingKnocks = state.knocks.filter(item => item.status === "pending");
    const cityRows = [TRACKS.imaginalDisk, TRACKS.eusexua, TRACKS.grace].map(track => ({
      track,
      count: PEOPLE.filter(person => person.track.album === track.album && person.status !== "offline").length,
    }));
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

      ${pendingKnocks.length ? `<div class="knock-strip">
        <div class="knock-stack">${pendingKnocks.slice(0, 2).map(item => avatar(personById(item.personId))).join("")}</div>
        <div class="knock-strip-copy"><strong>${pendingKnocks.length} ${pendingKnocks.length === 1 ? "person is" : "people are"} at your door</strong><span>${pendingKnocks.map(item => `${personById(item.personId).first} ${item.kind === "knock" ? "knocked" : "invited you"}`).join(" · ")}</span></div>
        <button data-action="knocks">Open</button>
      </div>` : ""}

      <div class="section-heading">
        <div><p class="eyebrow">Tonight</p><h2>Philadelphia is listening</h2></div>
        <button data-nav-jump="exchange">See Exchange</button>
      </div>
      <article class="city-signal">
        <p class="eyebrow">Live city signal</p>
        <h3>Records moving through the city</h3>
        <div class="city-lines">
          ${cityRows.map((row, index) => `<div class="city-line"><span class="rank">${String(index + 1).padStart(2, "0")}</span><div><strong>${row.track.album}</strong><span>${row.track.artist}</span></div><b>${row.count} active</b></div>`).join("")}
        </div>
      </article>`;
  }

  function renderExchange() {
    const allReviews = [...state.culture.posts, ...REVIEWS];
    const feedPeople = state.culture.feed === "following"
      ? new Set(["self", "zuri", "kevin", "mary"])
      : state.culture.feed === "local"
        ? new Set(["self", "zuri", "mary", "raj", "aaliyah"])
        : null;
    const reviews = feedPeople ? allReviews.filter(review => feedPeople.has(review.person)) : allReviews;
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
      <p class="feed-explainer">${state.culture.feed === "following" ? "People you chose to hear from, in recency order." : state.culture.feed === "local" ? "Voices from broad Philadelphia bands—never exact distance." : "A calm mix of people, music, and ideas connected to your taste."}</p>
      <div class="exchange-feed">
        ${reviews.map(review => {
          const person = personById(review.person);
          const saved = state.culture.saved.includes(review.id);
          const ownRating = state.culture.ratings[review.id];
          const replyCount = (state.culture.replies[review.id] || []).length || review.replies || 0;
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
            ${review.quote ? `<blockquote class="review-pullquote">“${review.quote}”</blockquote>` : ""}
            <div class="post-actions">
              <button data-rate="${review.id}">${ICONS.star}<span>${ownRating ? `Your rating ${ownRating}` : "Rate"}</span></button>
              <button data-thread="${review.id}">${ICONS.reply}<span>${replyCount} ${replyCount === 1 ? "reply" : "replies"}</span></button>
              <button data-join="${person.id}">${ICONS.join}<span>Listen</span></button>
              <button data-save="${review.id}">${ICONS.save}<span>${saved ? "Saved" : "Save"}</span></button>
            </div>
          </article>`;
        }).join("") || '<div class="empty-state"><img src="brand/tether-mark.svg" alt=""><h3>This feed is quiet.</h3><p>Follow voices you value or publish the first thought here.</p><button class="button primary" data-action="create">Write something</button></div>'}
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
    if (dating && state.dating.tab === "deck") requestAnimationFrame(installDatingDrag);
  }

  function renderSocialPeople() {
    const conversations = Object.entries(state.conversations);
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
        ${conversations.map(([id, conversation]) => {
          const person = personById(id);
          const last = conversation.messages.at(-1);
          const copy = last?.text || "Start with a song.";
          return `<button class="chat-row" data-chat="${id}">
            ${avatar(person)}
            <span class="chat-copy"><strong>${person.name}</strong><span>${copy}</span></span>
            <span class="chat-meta"><time>${conversation.time}</time>${conversation.unread ? "<i></i>" : ""}</span>
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
    const candidates = datingCandidates();
    const candidate = candidates[0];
    const tab = state.dating.tab;
    return `<div class="dating-shell">
      <div class="dating-topline">
        <span class="live-pill">${canUseDating() && state.dating.discoverable ? "Visible" : "Private preview"}</span>
        <button class="text-button" data-action="${state.dating.enabled ? "dating-settings" : "dating-setup"}">${state.dating.enabled ? "Preferences" : "Turn on Dating"}</button>
      </div>
      ${canUseDating() ? "" : `<article class="dating-consent-note"><span>${ICONS.heart}</span><div><strong>Browse the shape of Dating privately.</strong><p>To act on profiles, complete the 18+ check and explicitly turn Dating on.</p></div><button data-action="dating-setup">Set up</button></article>`}
      <div class="segment-tabs dating-tabs" role="tablist" aria-label="Dating sections">
        ${[
          ["deck", "Deck"],
          ["grid", "Grid"],
          ["signals", `Signals ${state.dating.signals.length}`],
        ].map(([id, label]) => `<button class="${tab === id ? "active" : ""}" data-dating-tab="${id}" role="tab" aria-selected="${tab === id}">${label}</button>`).join("")}
      </div>
      ${tab === "deck" ? renderDatingDeck(candidate) : tab === "grid" ? renderDatingGrid(PEOPLE.filter(eligibleForDating).slice(0, 50)) : renderSignals()}`;
  }

  function renderDatingDeck(person) {
    const lastDecision = state.dating.history.at(-1);
    if (!person) {
      return `<div class="dating-toolbar">
        <span><strong>You reached the end for now</strong><small>No loops. No recycled profiles.</small></span>
        <button class="text-button" data-action="dating-filters">Adjust filters</button>
      </div>
      <section class="dating-empty">
        <div class="dating-empty-orbit"><img src="brand/tether-mark.svg" alt=""></div>
        <p class="eyebrow">You heard everyone in this set</p>
        <h2>A good deck knows when to stop.</h2>
        <p>Widen a broad location band, change a preference, or come back when new people join.</p>
        <div class="sheet-actions">
          <button class="button ghost" data-date-action="undo" ${lastDecision ? "" : "disabled"}>Undo last choice</button>
          <button class="button rose" data-action="dating-filters">Tune discovery</button>
        </div>
      </section>`;
    }
    return `<div class="dating-toolbar">
      <span><strong>Discover</strong><small>Mutual fit + music evidence</small></span>
      <button class="text-button" data-action="dating-filters">Filters · free</button>
    </div>
    <article class="dating-card" data-dating-profile="${person.id}" data-drag-card tabindex="0" aria-label="${person.name}, ${person.age}. Drag left to pass or right to like; press Enter for the full profile.">
      ${avatar(person, "dating-photo")}
      <div class="dating-photo-scrim"></div>
      <span class="decision-stamp pass-stamp" aria-hidden="true">Pass</span>
      <span class="decision-stamp like-stamp" aria-hidden="true">Like</span>
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
    <button class="undo-chip" data-date-action="undo" ${lastDecision ? "" : "disabled"}>Undo last choice</button>`;
  }

  function renderDatingGrid(candidates) {
    const active = candidates.filter(person => person.status !== "offline").slice(0, 8);
    return `<div class="dating-toolbar"><span><strong>${candidates.length} people in your bands</strong><small>Never ordered by exact distance</small></span><button class="text-button" data-action="dating-filters">Bands</button></div>
      <section class="people-radar" aria-label="${active.length} people are active across your broad location bands">
        <div class="radar-copy"><p class="eyebrow">City pulse</p><h3>${active.length} people are around tonight</h3><p>Presence without surveillance: approximate bands, shuffled order, no mileage.</p></div>
        <div class="radar-field" aria-hidden="true">
          <i></i><i></i><i></i><span class="radar-self"><img src="${state.account.photo}" alt=""></span>
          ${active.slice(0, 5).map((person, index) => `<span class="radar-person p${index + 1}">${avatar(person)}</span>`).join("")}
        </div>
      </section>
      <div class="dating-grid">${candidates.map(person => `
        <button class="dating-grid-card" data-dating-profile="${person.id}">
          ${avatar(person)}
          <span class="dating-grid-copy"><strong>${person.first}, ${person.age}</strong><span>${person.band} · ${person.intent}</span>${person.status !== "offline" ? '<i>Active now</i>' : ""}</span>
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

  function requireDatingConsent() {
    if (canUseDating()) return true;
    openDatingSettings(true);
    showToast(isAdult() ? "Finish your Dating profile to act on people." : "Dating actions require an 18+ age check.");
    return false;
  }

  function makeDatingDecision(action, id) {
    if (!requireDatingConsent()) return;
    const target = action === "pass" ? "passed" : "liked";
    const other = action === "pass" ? "liked" : "passed";
    state.dating[target] = [...new Set([...state.dating[target], id])];
    state.dating[other] = state.dating[other].filter(personId => personId !== id);
    state.dating.history.push({ action, id, at: Date.now() });
    const isMatch = action === "like" && ["zuri", "hiroshi"].includes(id) && !state.dating.matches.includes(id);
    if (isMatch) state.dating.matches.push(id);
    save();
    renderPeople();
    if (isMatch) setTimeout(() => openMatch(id), 120);
    else showToast(action === "pass" ? "Passed. You can undo this choice." : "Interest saved privately.");
  }

  function undoDatingDecision() {
    const decision = state.dating.history.pop();
    if (!decision) {
      showToast("Nothing to undo.");
      return;
    }
    state.dating[decision.action === "pass" ? "passed" : "liked"] =
      state.dating[decision.action === "pass" ? "passed" : "liked"].filter(id => id !== decision.id);
    state.dating.matches = state.dating.matches.filter(id => id !== decision.id);
    save();
    renderPeople();
    showToast(`${personById(decision.id).first} is back in your deck.`);
  }

  function installDatingDrag() {
    const card = $("[data-drag-card]");
    if (!card || card.dataset.dragReady) return;
    card.dataset.dragReady = "true";
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let deltaY = 0;

    const reset = () => {
      card.classList.remove("dragging", "lean-pass", "lean-like");
      card.style.transform = "";
      card.style.opacity = "";
    };

    card.addEventListener("pointerdown", event => {
      if (event.target.closest("button")) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      deltaX = 0;
      deltaY = 0;
      card.setPointerCapture?.(pointerId);
      card.classList.add("dragging");
    });
    card.addEventListener("pointermove", event => {
      if (event.pointerId !== pointerId) return;
      deltaX = event.clientX - startX;
      deltaY = event.clientY - startY;
      card.style.transform = `translate(${deltaX}px,${Math.min(0, deltaY * .18)}px) rotate(${deltaX / 24}deg)`;
      card.classList.toggle("lean-pass", deltaX < -34);
      card.classList.toggle("lean-like", deltaX > 34);
    });
    const finish = event => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      if (Math.abs(deltaX) >= 92) {
        lastDragAt = Date.now();
        const action = deltaX < 0 ? "pass" : "like";
        card.classList.add(`exit-${action}`);
        card.style.transform = `translateX(${deltaX < 0 ? -125 : 125}%) rotate(${deltaX < 0 ? -14 : 14}deg)`;
        card.style.opacity = "0";
        setTimeout(() => makeDatingDecision(action, card.dataset.datingProfile), 180);
      } else if (deltaY < -74) {
        lastDragAt = Date.now();
        reset();
        openProfile(card.dataset.datingProfile, "dating");
      } else {
        reset();
      }
    };
    card.addEventListener("pointerup", finish);
    card.addEventListener("pointercancel", finish);
  }

  function openMatch(id) {
    const person = personById(id);
    setOverlay(`<div class="match-backdrop">
      <section class="match-moment" role="dialog" aria-modal="true" aria-labelledby="match-title">
        <button class="match-close" data-action="close" aria-label="Close">${ICONS.close}</button>
        <div class="match-radiance" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="match-portraits">${avatar(person)}<img src="${state.account.photo}" alt=""></div>
        <p class="eyebrow">Mutual signal</p>
        <h2 id="match-title">You and ${person.first} found each other.</h2>
        <p>No cold opener needed. Start with the song already between you.</p>
        <div class="match-song">${coverHTML(person.anthem, "mini-art")}<span><small>Your shared starting point</small><strong>${person.anthem.title} · ${person.anthem.artist}</strong></span></div>
        <div class="sheet-actions">
          <button class="button ghost" data-action="close">Keep discovering</button>
          <button class="button rose" data-chat="${person.id}">Say hello with music</button>
        </div>
      </section>
    </div>`, "match");
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

      ${state.culture.saved.length ? `<section class="profile-section">
        <div class="section-heading"><div><p class="eyebrow">Kept close</p><h2>Saved from Exchange</h2></div><button data-nav-jump="exchange">Open Exchange</button></div>
        <div class="saved-rail">${state.culture.saved.map(id => [...state.culture.posts, ...REVIEWS].find(review => review.id === id)).filter(Boolean).map(review => `<button data-nav-jump="exchange">${coverHTML(review.object, "mini-art")}<span><strong>${review.object.album}</strong><small>${personById(review.person).name}</small></span></button>`).join("")}</div>
      </section>` : ""}

      <section class="profile-section">
        <div class="section-heading"><div><p class="eyebrow">Shared history</p><h2>Memories</h2></div><button data-action="all-memories">See all</button></div>
        <div class="memory-timeline">
          ${state.memories.slice(0, 5).map(memory => {
            const person = personById(memory.personId);
            const minutes = Math.max(1, Math.round(memory.seconds / 60));
            return `<article class="memory-item"><span class="memory-mark"><img src="brand/tether-mark.svg" alt=""></span><div class="memory-copy"><time>${escapeHTML(memory.date)}</time><h3>You + ${person.first} · ${escapeHTML(memory.track)}</h3><p>${memory.feeling ? `“${escapeHTML(memory.feeling)}”` : `${minutes} min together · ${memory.pulses} Pulse${memory.pulses === 1 ? "" : "s"}.`}</p></div></article>`;
          }).join("")}
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
    if (!overlay) lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay = name;
    $("#overlay-root").innerHTML = html;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const root = $("#overlay-root");
      const target = $("[autofocus]", root) || $("button, input, select, textarea, [tabindex]:not([tabindex='-1'])", root);
      target?.focus?.();
    });
  }

  function closeOverlay() {
    const closing = overlay;
    const memory = closing === "stage" ? finalizeSession() : null;
    overlay = null;
    $("#overlay-root").innerHTML = "";
    document.body.style.overflow = "";
    lastFocused?.focus?.();
    lastFocused = null;
    if (memory) {
      renderYou();
      setTimeout(() => openMemoryReflection(memory.id), 120);
    }
  }

  function sheetHTML(kicker, title, body, wide = false) {
    return `<div class="sheet-backdrop" data-action="close-sheet"><section class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}" data-sheet>
      <header class="sheet-head"><div><p class="eyebrow">${escapeHTML(kicker)}</p><h2>${escapeHTML(title)}</h2></div><button data-action="close" aria-label="Close">${ICONS.close}</button></header>
      ${body}
    </section></div>`;
  }

  function openAbout() {
    setOverlay(sheetHTML("A living product demo", "Tether is about shared presence.", `
      <p>Browse seeded fictional people, culture, and music freely. People, activity, messages, and city counts are designed demo data—not a live network. The demo keeps your choices on this device and labels the moments that would connect to a real provider.</p>
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
        <div class="choice-card future-choice"><i>${ICONS.save}</i><span><strong>Build a list</strong><small>Designed next · curate records around a feeling.</small></span></div>
        <div class="choice-card future-choice"><i>${ICONS.signal}</i><span><strong>Leave a capsule</strong><small>Designed next · save a song for the right moment.</small></span></div>
      </div>`), "create");
  }

  function openReviewComposer() {
    const ratings = [];
    for (let value = .5; value <= 5; value += .5) ratings.push(value.toFixed(1));
    ratings.push("6.0");
    setOverlay(sheetHTML("New review", "What did the music do?", `
      <label class="field"><span>Music</span><select name="reviewMusic"><option>Grace — Jeff Buckley</option><option>Imaginal Disk — Magdalena Bay</option><option>Eusexua — FKA twigs</option><option>Jubilee — Japanese Breakfast</option></select></label>
      <label class="field"><span>Your rating</span><select name="reviewRating">${ratings.map(value => `<option ${value === "4.5" ? "selected" : ""} value="${value}">${value}${value === "6.0" ? " — Platinum" : "/5"}</option>`).join("")}</select></label>
      <label class="field"><span>Your words</span><textarea name="reviewText" maxlength="1200" placeholder="Write the sentence only you could write…"></textarea></label>
      <p class="field-note">0.5–5.0 is the normal scale. 6.0 is Platinum: rare, personal canon, no fractions above five.</p>
      <div class="sheet-actions"><button class="button ghost" data-action="close">Save draft</button><button class="button primary" data-submit-review>Publish</button></div>`), "review");
  }

  function reviewById(id) {
    return [...state.culture.posts, ...REVIEWS].find(review => review.id === id);
  }

  function trackFromReviewChoice(choice) {
    if (choice.startsWith("Imaginal")) return TRACKS.imaginalDisk;
    if (choice.startsWith("Eusexua")) return TRACKS.eusexua;
    if (choice.startsWith("Jubilee")) return TRACKS.jubilee;
    return TRACKS.grace;
  }

  function openRating(id) {
    const review = reviewById(id);
    if (!review) return;
    const current = state.culture.ratings[id];
    const ratings = [];
    for (let value = .5; value <= 5; value += .5) ratings.push(value.toFixed(1));
    ratings.push("6.0");
    setOverlay(sheetHTML("Your private scale", `Rate ${review.object.album}`, `
      <div class="rating-picker">${ratings.map(value => `<button class="${current === value ? "active" : ""} ${value === "6.0" ? "platinum" : ""}" data-rating-value="${value}" data-rating-review="${id}"><span>${value}</span><small>${value === "6.0" ? "Platinum" : "/ 5"}</small></button>`).join("")}</div>
      <p class="field-note">Your rating is stored on this device and shown on the post. Choose 6.0 only for a record in your personal canon.</p>
      ${current ? `<button class="button ghost full-button" data-clear-rating="${id}">Remove my rating</button>` : ""}`), "rating");
  }

  function openThread(id) {
    const review = reviewById(id);
    if (!review) return;
    const author = personById(review.person);
    const replies = state.culture.replies[id] || [];
    setOverlay(`<div class="sheet-backdrop"><section class="sheet chat-sheet" role="dialog" aria-modal="true" aria-labelledby="thread-title">
      <header class="sheet-head"><div><p class="eyebrow">Exchange discussion</p><h2 id="thread-title">${review.object.album}</h2></div><button data-action="close" aria-label="Close">${ICONS.close}</button></header>
      <article class="thread-origin"><div>${avatar(author)}<span><strong>${author.name}</strong><small>${review.time}</small></span></div><p>${review.text}</p></article>
      <div class="thread" data-thread-messages>
        ${replies.map(reply => `<div class="discussion-reply ${reply.mine ? "mine" : ""}"><strong>${reply.mine ? "You" : escapeHTML(reply.author)}</strong><p>${escapeHTML(reply.text)}</p></div>`).join("") || '<div class="thread-empty"><strong>Open the conversation.</strong><p>Reply to the idea, not the person.</p></div>'}
      </div>
      <form class="chat-compose" data-thread-form="${id}"><input aria-label="Reply" placeholder="Add to the thought…" maxlength="360" autocomplete="off"><button type="submit">Reply</button></form>
    </section></div>`, "thread");
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

  function openKnocks() {
    const pending = state.knocks.filter(item => item.status === "pending");
    setOverlay(sheetHTML("At your door", pending.length ? "Choose each moment." : "Your door is quiet.", pending.length ? `
      <div class="knock-list">${pending.map(item => {
        const person = personById(item.personId);
        return `<article class="knock-request">${avatar(person)}<div><span class="live-pill">${item.kind === "knock" ? "Knock" : "Invitation"}</span><h3>${person.name}</h3><p>${item.kind === "knock" ? `${person.first} wants to join your current listening.` : `${person.first} invited you into ${person.track.title}.`}</p><div><button class="button ghost" data-knock-decline="${item.id}">Not now</button><button class="button sync" data-knock-accept="${item.id}">${item.kind === "knock" ? "Let in" : "Join"}</button></div></div></article>`;
      }).join("")}</div>` : '<div class="empty-state"><img src="brand/tether-mark.svg" alt=""><p>New Knocks and listening invitations will arrive here.</p></div>'), "knocks");
  }

  function openChat(id) {
    const person = personById(id);
    const conversation = state.conversations[id] || { unread: false, time: "Now", messages: [] };
    state.conversations[id] = conversation;
    conversation.unread = false;
    save();
    setOverlay(`<div class="sheet-backdrop"><section class="sheet chat-sheet" role="dialog" aria-modal="true" aria-label="Conversation with ${person.name}">
      <header class="sheet-head"><div class="chat-person">${avatar(person)}<span><strong>${person.name}</strong><small>${person.status === "offline" ? "Last active today" : `Listening to ${person.track.title}`}</small></span></div><button data-action="close" aria-label="Close">${ICONS.close}</button></header>
      <button class="button primary" data-join="${person.id}">${ICONS.join} Listen together</button>
      <div class="thread" data-conversation-thread>
        ${conversation.messages.map(message => `<div class="bubble ${message.mine ? "mine" : ""}">${escapeHTML(message.text)}</div>`).join("") || `<div class="thread-empty"><strong>Start with what you both heard.</strong><p>${person.anthem.title} is already between you.</p></div>`}
      </div>
      <form class="chat-compose" data-chat-form="${person.id}"><input aria-label="Message" placeholder="Message ${person.first}…" maxlength="500" autocomplete="off"><button type="submit">Send</button></form>
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
    datingSetupStep = setup || !state.dating.enabled ? 0 : 2;
    datingDraft = {
      birthDate: state.account.birthDate,
      discoverable: state.dating.discoverable,
      profile: clone(state.dating.profile),
    };
    renderDatingSetup();
  }

  function renderDatingSetup() {
    const profile = datingDraft.profile;
    const steps = [
      {
        kicker: "Private until you say otherwise",
        title: "Dating starts with consent.",
        body: `<div class="consent-hero"><span>${ICONS.heart}</span><h3>Music identity can carry over. Dating never does.</h3><p>Your profile stays invisible until you finish setup and explicitly publish it. This browser check confirms a self-declared age; it is not identity verification.</p></div>
          <label class="field"><span>Date of birth</span><input type="date" name="datingBirthDate" value="${escapeHTML(datingDraft.birthDate)}" max="${new Date().toISOString().slice(0, 10)}" autocomplete="bday"></label>
          <label class="consent-check"><input type="checkbox" data-dating-adult ${ageFromBirthDate(datingDraft.birthDate) >= 18 ? "checked" : ""}><span>I confirm I am 18 or older and want to set up Dating.</span></label>`,
      },
      {
        kicker: "A profile with dimension",
        title: "Choose at least two photos.",
        body: `<div class="photo-studio">
            ${profile.photos.map((photo, index) => `<figure><img src="${photo}" alt="Dating photo ${index + 1}"><button data-remove-dating-photo="${index}" aria-label="Remove photo ${index + 1}">${ICONS.close}</button><figcaption>${index === 0 ? "Cover" : `Photo ${index + 1}`}</figcaption></figure>`).join("")}
            <label class="photo-upload"><input type="file" accept="image/*" multiple data-dating-photo-upload><span>+</span><strong>Add photos</strong><small>JPG, PNG, or WebP</small></label>
          </div>
          <p class="field-note">Your first photo becomes your shared Tether cover. Photos belong to one identity; Dating adds privacy and context, not a disconnected persona. Uploads stay in this browser demo.</p>`,
      },
      {
        kicker: "Mutual fit first",
        title: "Who and what are you looking for?",
        body: `<label class="field"><span>I want to meet</span><select name="datingMeet">
            ${["Women and nonbinary people", "Men and nonbinary people", "Everyone"].map(value => `<option ${profile.meet === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          <label class="field"><span>Relationship intention</span><select name="datingIntent">
            ${["Long-term · slow burn", "Long-term", "Dating and friends", "Still figuring it out"].map(value => `<option ${profile.intent === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          <label class="field"><span>Relationship structure</span><select name="datingStructure">
            ${["Monogamous", "Non-monogamous", "Open to exploring"].map(value => `<option ${profile.structure === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          <div class="range-readout"><span>Age range</span><strong>21–32</strong></div>
          <input class="range" type="range" min="18" max="50" value="32" aria-label="Maximum age">
          <p class="field-note">Discovery uses reciprocal preferences and broad place bands—never exact distance.</p>`,
      },
      {
        kicker: "Start with a song",
        title: "Give someone a real opening.",
        body: `<label class="field"><span>Your anthem</span><select name="datingAnthem">
            ${["Grace — Jeff Buckley", "Weird Fishes / Arpeggi — Radiohead", "Paprika — Japanese Breakfast", "Pink + White — Frank Ocean"].map(value => `<option ${profile.anthem === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          <label class="field"><span>Prompt</span><select name="datingPrompt">
            ${["The song I wish I could hear again for the first time", "The record that understands me", "My ideal first Tether is", "A lyric I carry everywhere"].map(value => `<option ${profile.prompt === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          <label class="field"><span>Your answer</span><textarea name="datingAnswer" maxlength="180" placeholder="Make it specific enough to start a conversation.">${escapeHTML(profile.answer)}</textarea></label>`,
      },
      {
        kicker: "Visibility, field by field",
        title: "You decide what travels.",
        body: `<div class="visibility-matrix">
          ${Object.entries({ age: "Age", intent: "Intent", structure: "Relationship structure", city: "City band" }).map(([field, label]) => `<label><span><strong>${label}</strong><small>${field === "city" ? "Used for broad discovery" : "Shown on your Dating profile"}</small></span><select name="visibility-${field}">
            ${["Public", "After match", "Filter only", "Do not use"].map(value => `<option ${profile.visibility[field].toLowerCase() === value.toLowerCase() ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>`).join("")}
        </div>
        <label class="publish-control"><input type="checkbox" data-dating-publish ${datingDraft.discoverable ? "checked" : ""}><span><strong>Publish my Dating profile</strong><small>Turn this off any time without deleting your profile.</small></span></label>
        <article class="safety-note"><strong>Your safety controls stay attached.</strong><p>Block, report, pause visibility, and remove a match from every profile and conversation surface.</p></article>`,
      },
    ];
    const step = steps[datingSetupStep];
    setOverlay(`<div class="sheet-backdrop"><section class="sheet dating-studio" role="dialog" aria-modal="true" aria-labelledby="dating-setup-title">
      <div class="progress-bar"><i style="width:${((datingSetupStep + 1) / steps.length) * 100}%"></i></div>
      <header class="sheet-head"><div><p class="eyebrow">${step.kicker}</p><h2 id="dating-setup-title">${step.title}</h2></div><button data-action="close" aria-label="Close">${ICONS.close}</button></header>
      ${step.body}
      <div class="sheet-actions">${datingSetupStep ? '<button class="button ghost" data-dating-setup-back>Back</button>' : '<button class="button ghost" data-action="close">Not now</button>'}<button class="button rose" data-dating-setup-next>${datingSetupStep === steps.length - 1 ? "Save and finish" : "Continue"}</button></div>
    </section></div>`, "dating-settings");
  }

  function collectDatingSetup() {
    const birthDate = $('[name="datingBirthDate"]')?.value;
    if (birthDate !== undefined) datingDraft.birthDate = birthDate;
    const values = {
      meet: $('[name="datingMeet"]')?.value,
      intent: $('[name="datingIntent"]')?.value,
      structure: $('[name="datingStructure"]')?.value,
      anthem: $('[name="datingAnthem"]')?.value,
      prompt: $('[name="datingPrompt"]')?.value,
      answer: $('[name="datingAnswer"]')?.value.trim(),
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined) datingDraft.profile[key] = value;
    });
    Object.keys(datingDraft.profile.visibility).forEach(field => {
      const value = $(`[name="visibility-${field}"]`)?.value;
      if (value) datingDraft.profile.visibility[field] = value;
    });
    const publish = $("[data-dating-publish]");
    if (publish) datingDraft.discoverable = publish.checked;
  }

  function advanceDatingSetup() {
    collectDatingSetup();
    if (datingSetupStep === 0 && ageFromBirthDate(datingDraft.birthDate) < 18) {
      showToast("Dating is available only after an 18+ age check.");
      $('[name="datingBirthDate"]')?.focus();
      return;
    }
    if (datingSetupStep === 1 && datingDraft.profile.photos.length < 2) {
      showToast("Add at least two photos so your profile feels complete.");
      return;
    }
    if (datingSetupStep === 3 && !datingDraft.profile.answer) {
      showToast("Add a prompt answer that gives people a way in.");
      $('[name="datingAnswer"]')?.focus();
      return;
    }
    if (datingSetupStep < 4) {
      datingSetupStep += 1;
      renderDatingSetup();
      return;
    }
    state.account.birthDate = datingDraft.birthDate;
    state.dating.profile = clone(datingDraft.profile);
    state.account.photo = datingDraft.profile.photos[0];
    state.dating.enabled = true;
    state.dating.discoverable = datingDraft.discoverable;
    save();
    closeOverlay();
    renderPeople();
    showToast(state.dating.discoverable ? "Dating is on and your profile is visible." : "Dating profile saved and kept private.");
  }

  function openFilters() {
    setOverlay(sheetHTML("Discovery bands", "People see the band, never your location.", `
      <div class="filter-radar" aria-hidden="true"><i></i><i></i><i></i><span><img src="${state.account.photo}" alt=""></span><b class="f1"></b><b class="f2"></b><b class="f3"></b><b class="f4"></b></div>
      <div class="choice-grid">
        <button class="choice-card active"><i>1</i><span><strong>Nearby</strong><small>Your closest broad band</small></span></button>
        <button class="choice-card active"><i>2</i><span><strong>Around Philly</strong><small>The city and immediate area</small></span></button>
        <button class="choice-card"><i>3</i><span><strong>Greater region</strong><small>Wider metro area</small></span></button>
      </div>
      <p class="field-note">The dots communicate activity, not exact people or positions. Order is deliberately shuffled.</p>
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
        state.session.personId = guest.id;
        save();
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

  function finalizeSession() {
    const personId = state.session.personId;
    const person = personId ? personById(personId) : null;
    const track = person?.track || TRACKS.nightTransit;
    const qualifies = Boolean(person && (sessionSeconds >= 5 || state.session.pulses > 0));
    const memory = qualifies ? {
      id: `memory-${Date.now()}`,
      personId,
      track: track.title,
      artist: track.artist,
      seconds: sessionSeconds,
      pulses: state.session.pulses,
      date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date()).toUpperCase(),
      feeling: "",
    } : null;
    if (memory) state.memories.unshift(memory);
    stopSession();
    state.session.personId = null;
    state.session.pulses = 0;
    sessionSeconds = 0;
    save();
    return memory;
  }

  function openMemoryReflection(id) {
    const memory = state.memories.find(item => item.id === id);
    if (!memory) return;
    const person = personById(memory.personId);
    setOverlay(sheetHTML("A new Memory", `What stayed with you after listening with ${person.first}?`, `
      <div class="memory-recap">${coverHTML(person.track, "mini-art")}<span><small>${Math.max(1, Math.round(memory.seconds / 60))} min together · ${memory.pulses} Pulse${memory.pulses === 1 ? "" : "s"}</small><strong>${memory.track} · ${memory.artist}</strong></span></div>
      <label class="field"><span>Your private reflection</span><textarea name="memoryFeeling" maxlength="180" placeholder="The moment I want to remember…"></textarea></label>
      <div class="sheet-actions"><button class="button ghost" data-action="close">Skip</button><button class="button primary" data-save-memory="${memory.id}">Keep this Memory</button></div>`), "memory");
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
    setupDraft = { ...state.account, intent: state.dating.enabled ? "both" : "friends", providerRevealed: false };
    renderOnboarding();
  }

  function renderOnboarding() {
    const steps = [
      {
        kicker: "Make it yours",
        title: "What should people call you?",
        body: `<label class="field"><span>Your name</span><input name="displayName" value="${escapeHTML(setupDraft.displayName)}" autocomplete="name" placeholder="Alex Rivera"></label>
          <label class="field"><span>Date of birth</span><input type="date" name="birthDate" value="${escapeHTML(setupDraft.birthDate)}" max="${new Date().toISOString().slice(0, 10)}" autocomplete="bday"></label>
          <p class="field-note">Your birthday stays private. It is used only to gate adult-only spaces such as Dating.</p>`,
      },
      {
        kicker: "Your place",
        title: "Where does your listening live?",
        body: `<label class="field"><span>City</span><input name="city" value="${escapeHTML(setupDraft.city)}" autocomplete="address-level2" placeholder="Philadelphia"></label><p>People see a broad city or band—never your exact location.</p>`,
      },
      {
        kicker: "Your face in the room",
        title: "Choose a portrait that feels like you.",
        body: `<div class="profile-photo-editor"><img src="${setupDraft.photo}" alt="Current profile portrait"><div><strong>Your profile cover</strong><p>Upload your own image or start with an illustrated placeholder.</p><label class="button secondary"><input type="file" accept="image/*" data-profile-photo-upload>Upload a photo</label></div></div>
          <div class="portrait-options">${["realjohn.svg", "x_joseph_x.svg", "x_christopher_x.svg", "realwilliam.svg"].map(file => `<button class="${setupDraft.photo.endsWith(file) ? "selected" : ""}" data-setup-photo="avatars/${file}" aria-label="Choose portrait"><img src="avatars/${file}" alt=""></button>`).join("")}</div>`,
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
        body: `<article class="provider-card ${setupDraft.providerRevealed ? "connected" : ""}">
          <div class="provider-mark">S</div><div><p class="eyebrow">${setupDraft.providerRevealed ? "Demo identity revealed" : "Spotify preview"}</p><h3>${setupDraft.providerRevealed ? "Your musical interior has shape." : "See what your listening would reveal."}</h3><p>${setupDraft.providerRevealed ? "Jeff Buckley after midnight · Radiohead album loyalist · Japanese Breakfast in bright weather." : "This is a simulated provider reveal. It never contacts Spotify or imports an account."}</p></div>
          <button class="button ${setupDraft.providerRevealed ? "ghost" : "primary"}" data-provider-reveal>${setupDraft.providerRevealed ? "Revealed" : "Preview my taste"}</button>
        </article>${setupDraft.providerRevealed ? '<div class="taste-chips reveal-chips"><span class="chip">Jeff Buckley</span><span class="chip">Radiohead</span><span class="chip">Japanese Breakfast</span><span class="chip">Album-order loyalist</span></div>' : ""}`,
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
    const birthDate = $('[name="birthDate"]')?.value;
    if (name) setupDraft.displayName = name;
    if (city) setupDraft.city = city;
    if (birthDate !== undefined) setupDraft.birthDate = birthDate;
    if (setupStep < 4) {
      setupStep += 1;
      renderOnboarding();
      return;
    }
    state.account = { ...state.account, ...setupDraft, claimed: true };
    save();
    closeOverlay();
    render();
    if (setupDraft.intent === "dating" || setupDraft.intent === "both") {
      state.ui.view = "people";
      state.ui.peopleMode = "dating";
      save();
      render();
      openDatingSettings(true);
      showToast("Your main profile is ready. Dating still needs its own opt-in.");
    } else {
      navigate("you");
      showToast("Your Tether is ready.");
    }
  }

  function handleClick(event) {
    const button = event.target.closest("button, [data-dating-profile], [data-action]");
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
    if (button.dataset.datingProfile) {
      if (Date.now() - lastDragAt < 450) return;
      return openProfile(button.dataset.datingProfile, "dating");
    }
    if (button.dataset.chat) return openChat(button.dataset.chat);
    if (button.dataset.thread) return openThread(button.dataset.thread);
    if (button.dataset.join) return openSession(button.dataset.join);
    if (button.dataset.signal) {
      if (!requireDatingConsent()) return;
      return openSignal(button.dataset.signal);
    }
    if (button.dataset.sendSignal) {
      if (!requireDatingConsent()) return;
      const id = button.dataset.sendSignal;
      if (!state.dating.liked.includes(id)) state.dating.liked.push(id);
      state.dating.history.push({ action: "like", id, at: Date.now(), via: "signal" });
      closeOverlay();
      save();
      showToast(`Signal sent to ${personById(id).first}.`);
      return;
    }
    if (button.dataset.signalRespond) {
      const id = button.dataset.signalRespond;
      if (!requireDatingConsent()) return;
      if (!state.dating.matches.includes(id)) state.dating.matches.push(id);
      if (!state.dating.liked.includes(id)) state.dating.liked.push(id);
      state.dating.signals = state.dating.signals.filter(personId => personId !== id);
      save();
      openMatch(id);
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
      openRating(button.dataset.rate);
      return;
    }
    if (button.dataset.ratingValue) {
      state.culture.ratings[button.dataset.ratingReview] = button.dataset.ratingValue;
      save();
      closeOverlay();
      renderExchange();
      showToast(`Your rating is ${button.dataset.ratingValue}${button.dataset.ratingValue === "6.0" ? " · Platinum" : "/5"}.`);
      return;
    }
    if (button.dataset.clearRating) {
      delete state.culture.ratings[button.dataset.clearRating];
      save();
      closeOverlay();
      renderExchange();
      showToast("Rating removed.");
      return;
    }
    if (button.dataset.dateAction) {
      const action = button.dataset.dateAction;
      if (action === "undo") {
        undoDatingDecision();
      } else {
        if (overlay === "profile") closeOverlay();
        makeDatingDecision(action, button.dataset.person);
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
      const choice = $('[name="reviewMusic"]')?.value || "Grace — Jeff Buckley";
      const rating = $('[name="reviewRating"]')?.value || "4.5";
      const text = $('[name="reviewText"]')?.value.trim();
      if (!text) {
        showToast("Write the thought you want to leave behind.");
        $('[name="reviewText"]')?.focus();
        return;
      }
      state.culture.posts.unshift({
        id: `review-${Date.now()}`,
        person: "self",
        time: "Now",
        object: trackFromReviewChoice(choice),
        rating,
        text: escapeHTML(text),
        quote: "",
        replies: 0,
      });
      save();
      closeOverlay();
      renderExchange();
      renderYou();
      navigate("exchange");
      showToast("Published. Your review is now part of Exchange.");
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
    if (button.dataset.providerReveal !== undefined) {
      setupDraft.providerRevealed = true;
      renderOnboarding();
      return;
    }
    if (button.dataset.setupNext !== undefined) return advanceOnboarding();
    if (button.dataset.setupBack !== undefined) {
      setupStep = Math.max(0, setupStep - 1);
      renderOnboarding();
      return;
    }
    if (button.dataset.datingSetupNext !== undefined) return advanceDatingSetup();
    if (button.dataset.datingSetupBack !== undefined) {
      collectDatingSetup();
      datingSetupStep = Math.max(0, datingSetupStep - 1);
      renderDatingSetup();
      return;
    }
    if (button.dataset.removeDatingPhoto !== undefined) {
      datingDraft.profile.photos.splice(Number(button.dataset.removeDatingPhoto), 1);
      renderDatingSetup();
      return;
    }
    if (button.dataset.knockAccept) {
      const knock = state.knocks.find(item => item.id === button.dataset.knockAccept);
      if (!knock) return;
      knock.status = "accepted";
      save();
      closeOverlay();
      renderListen();
      openSession(knock.personId);
      return;
    }
    if (button.dataset.knockDecline) {
      const knock = state.knocks.find(item => item.id === button.dataset.knockDecline);
      if (knock) knock.status = "declined";
      save();
      renderListen();
      openKnocks();
      showToast("Invitation dismissed privately.");
      return;
    }
    if (button.dataset.saveMemory) {
      const memory = state.memories.find(item => item.id === button.dataset.saveMemory);
      if (memory) memory.feeling = $('[name="memoryFeeling"]')?.value.trim() || "A shared listen worth returning to.";
      save();
      closeOverlay();
      renderYou();
      navigate("you");
      showToast("Memory saved to your shared history.");
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
      case "knocks": openKnocks(); break;
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
    if (event.target.matches("[data-dating-publish]")) datingDraft.discoverable = event.target.checked;
    if (event.target.matches("[data-dating-photo-upload]")) {
      const files = [...event.target.files].slice(0, Math.max(0, 6 - datingDraft.profile.photos.length));
      Promise.all(files.map(file => resizeImage(file, 1200, .82)))
        .then(images => {
          datingDraft.profile.photos.push(...images);
          renderDatingSetup();
          showToast(`${images.length} photo${images.length === 1 ? "" : "s"} added.`);
        })
        .catch(error => showToast(error.message));
    }
    if (event.target.matches("[data-profile-photo-upload]")) {
      resizeImage(event.target.files[0], 1200, .84)
        .then(image => {
          setupDraft.photo = image;
          renderOnboarding();
          showToast("Profile portrait updated.");
        })
        .catch(error => showToast(error.message));
    }
  }

  function handleSubmit(event) {
    if (event.target.matches("[data-chat-form]")) {
      event.preventDefault();
      const input = $("input", event.target);
      const text = input?.value.trim();
      if (!text) return;
      const id = event.target.dataset.chatForm;
      const conversation = state.conversations[id] || { unread: false, time: "Now", messages: [] };
      conversation.messages.push({ mine: true, text });
      conversation.time = "Now";
      conversation.unread = false;
      state.conversations[id] = conversation;
      save();
      input.value = "";
      const thread = $("[data-conversation-thread]", event.target.closest(".chat-sheet"));
      $(".thread-empty", thread)?.remove();
      thread?.insertAdjacentHTML("beforeend", `<div class="bubble mine">${escapeHTML(text)}</div>`);
      thread?.scrollTo?.({ top: thread.scrollHeight, behavior: "smooth" });
      setTimeout(() => {
        if (overlay !== "chat") return;
        const person = personById(id);
        const reply = `I’m in. Save ${person.anthem.title} for our next Tether?`;
        conversation.messages.push({ mine: false, text: reply });
        conversation.time = "Now";
        save();
        thread?.insertAdjacentHTML("beforeend", `<div class="bubble">${escapeHTML(reply)}</div>`);
        thread?.scrollTo?.({ top: thread.scrollHeight, behavior: "smooth" });
      }, 650);
      return;
    }
    if (event.target.matches("[data-thread-form]")) {
      event.preventDefault();
      const input = $("input", event.target);
      const text = input?.value.trim();
      if (!text) return;
      const id = event.target.dataset.threadForm;
      state.culture.replies[id] = [...(state.culture.replies[id] || []), { mine: true, author: "You", text }];
      save();
      openThread(id);
      setTimeout(() => $("[data-thread-messages]")?.scrollTo?.({ top: $("[data-thread-messages]").scrollHeight }), 0);
    }
  }

  function install() {
    render();
    loadCityPopulation();
    document.addEventListener("error", event => {
      if (!(event.target instanceof HTMLImageElement) || event.target.dataset.fallbackApplied) return;
      event.target.dataset.fallbackApplied = "true";
      const person = PEOPLE.find(item => event.target.src.endsWith(item.avatar)) || personById("self");
      const initials = (person.name || "Tether").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#8b7cff"/><stop offset="1" stop-color="#2b2040"/></linearGradient></defs><rect width="192" height="192" fill="url(#g)"/><text x="96" y="108" text-anchor="middle" fill="#f2f1fa" font-family="Arial,sans-serif" font-size="62" font-weight="700">${initials}</text></svg>`;
      event.target.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }, true);
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
      if (event.key === "Escape" && overlay) {
        event.preventDefault();
        closeOverlay();
        return;
      }
      if (event.key === "Tab" && overlay) {
        const focusable = $$("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])", $("#overlay-root"))
          .filter(node => node.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    document.addEventListener("keyup", event => {
      if ((event.key === " " || event.key === "Enter") && event.target.matches("[data-pulse]")) releasePulse(event.target);
    });
    if (!state.account.claimed) setTimeout(() => showToast("Browse freely. Claim your profile when you're ready."), 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
