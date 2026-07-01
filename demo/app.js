const state = {
  profiles: [],
  filter: "all",
  search: "",
  following: new Set(),
  selected: null,
  selectedPing: null,
  session: null,
  discoverMode: "radar",
  radiusMiles: 15,
  userPrivacy: "open-door",
  muted: new Set(),
  severed: new Set(),
  transparentPresence: new Set(),
  pulseCharging: false,
  pulseReady: false,
  pulseStartedAt: 0,
  pulseChargeTimer: null,
  pulseCooldownUntil: 0,
  sessionPaused: false,
  pulsesThisSession: 0,
  pulseCooldownTimerId: null,
  sessionStartedAt: 0,
  sessionTimerId: null,
  toastTimer: null,
  lastFocused: null
  ,swipeQueue: []
  ,swipeIndex: 0
  ,conversations: []
  ,musicService: "Spotify"
  ,wavelengthReady: false
  ,wavelengthStep: 0
  ,wavelengthProfile: { goal:"friends", gender:"", customGender:"", orientation:"", height:"", weight:"", avoidArtist:"", priorityArtist:"" }
};

const CURRENT_USER = {
  name: "John Roastpork",
  username: "john.roastpork",
  initials: "JR",
  latitude: 39.921162,
  longitude: -75.144890,
  neighborhood: "Pennsport",
  vibe: [0.64, 0.72, 0.68, 0.31]
};
const MOODS = ["Calm", "Nostalgic", "Heavy", "Discovery", "Night drive"];
const anchors = [
  { id: "a1", username: "zuri1188", track: "Neon Weather", artist: "Burna Boy", minutes: 48, pulses: 3, date: "Last Wednesday · 12:34 AM", mood: "Nostalgic", distance: "8.6 miles", health: 92 },
  { id: "a2", username: "raj_539", track: "Borrowed Time", artist: "Aminé", minutes: 31, pulses: 1, date: "Saturday · 11:20 PM", mood: "Calm", distance: "3.8 miles", health: 78 },
  { id: "a3", username: "james_341", track: "Southbound", artist: "Radiohead", minutes: 61, pulses: 7, date: "June 22 · 1:03 AM", mood: "Night drive", distance: "3.2 miles", health: 64 }
];
const capsules = [
  { id: "c1", username: "linda_331", track: "After the El", artist: "Japanese Breakfast", lock: "After midnight", opened: false, direction: "received" },
  { id: "c2", username: "realwilliam", track: "Second Coffee", artist: "Remi Wolf", lock: "When it rains", opened: false, direction: "sent" },
  { id: "c3", username: "joshua.nelson", track: "Cherry Street", artist: "Bon Iver", lock: "No lock", opened: true, direction: "received" }
];
const reviews = [
  { username:"realhiroshi", type:"album", title:"Imaginal Disk", artist:"Magdalena Bay", score:4.5, body:"Maximal without becoming shapeless. Every synth choice feels like another doorway, but the melodies keep pulling the whole thing back into focus.", subjectRatings:184, reviewRating:4.7, time:"18m" },
  { username:"zuri1188", type:"track", title:"Eusexua", artist:"FKA twigs", score:5, body:"A song that understands the dance floor as somewhere spiritual. The restraint is what makes the release hit.", subjectRatings:96, reviewRating:4.9, time:"42m" },
  { username:"james_341", type:"album", title:"The New Sound", artist:"Geordie Greep", score:4, body:"Chaotic, theatrical, occasionally exhausting—and completely committed to its own strange internal logic.", subjectRatings:211, reviewRating:4.2, time:"1h" },
  { username:"linda_331", type:"artist", title:"Japanese Breakfast", artist:"Artist retrospective", score:4.5, body:"Grief and joy treated as neighbors instead of opposites. The songwriting keeps getting more expansive without losing intimacy.", subjectRatings:73, reviewRating:4.8, time:"3h" }
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCase(value) {
  return value.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function compatibility(profile) {
  const vector = Object.values(profile.vibe);
  const dot = vector.reduce((sum, value, index) => sum + value * CURRENT_USER.vibe[index], 0);
  const a = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
  const b = Math.sqrt(CURRENT_USER.vibe.reduce((sum, value) => sum + value ** 2, 0));
  return Math.round((dot / (a * b)) * 100);
}

function buildConversations() {
  const lines = [
    "That transition was ridiculous — tether later?",
    "Sent you a Time Capsule ✦",
    "I’m listening now if you want to drop in.",
    "This track made me think of your night-drive playlist.",
    "Pulse received. Perfect timing.",
    "You: absolutely, give me five minutes."
  ];
  state.conversations = state.profiles.slice(2, 12).map((profile, index) => ({
    profile,
    preview: lines[index % lines.length],
    time: index < 2 ? `${9 - index}:4${index}` : index < 5 ? "Yesterday" : "Mon",
    unread: index < 3,
    messages: [
      { mine:false, text:index % 2 ? "I found something you need to hear." : "You around for a quick tether?" },
      { mine:true, text:index % 2 ? "Send it. I’m walking along the river." : "Yeah — opening the app now." },
      { mine:false, track:true, text:profile.currentTrack ? `${profile.currentTrack.name} · ${profile.currentTrack.artist}` : `${profile.topArtists[0]} radio · live mix` },
      { mine:false, text:lines[index % lines.length] }
    ]
  }));
}

function isDatingCompatible(profile) {
  const mine = state.wavelengthProfile;
  if (mine.goal !== "dating" || !mine.orientation || !mine.gender) return true;
  const myGender = mine.gender;
  const theirGender = profile.demoGender;
  const theirs = profile.demoOrientation;
  if (["Bisexual","Queer / open"].includes(mine.orientation)) {
    return ["Bisexual","Queer / open"].includes(theirs) ||
      (theirs === "Straight" && ["Man","Woman"].includes(myGender) && myGender !== theirGender) ||
      (theirs === "Gay" && myGender === theirGender);
  }
  if (mine.orientation === "Straight") {
    return ["Man","Woman"].includes(myGender) && myGender !== theirGender && ["Straight","Bisexual","Queer / open"].includes(theirs);
  }
  return myGender === theirGender && ["Gay","Bisexual","Queer / open"].includes(theirs);
}

function rebuildWavelengthQueue() {
  const settings = state.wavelengthProfile;
  const avoid = settings.avoidArtist.trim().toLowerCase();
  const priority = settings.priorityArtist.trim().toLowerCase();
  state.swipeQueue = [...state.profiles]
    .filter(profile => profile.privacyMode !== "ghost" && isDatingCompatible(profile))
    // TopArtists represents sustained affinity. Incidental track history is
    // intentionally ignored so a casual play never excludes a person.
    .filter(profile => !avoid || !profile.topArtists.some(artist => artist.toLowerCase() === avoid))
    .sort((a,b) => {
      const aPriority = priority && a.topArtists.slice(0,3).some(artist => artist.toLowerCase() === priority) ? 1 : 0;
      const bPriority = priority && b.topArtists.slice(0,3).some(artist => artist.toLowerCase() === priority) ? 1 : 0;
      return bPriority - aPriority || compatibility(b) - compatibility(a) || distanceMiles(a) - distanceMiles(b);
    });
  state.swipeIndex = 0;
  renderSwipeDeck();
}

function renderSwipeDeck() {
  const deck = $("#swipe-deck");
  if (!deck) return;
  const available = state.swipeQueue.slice(state.swipeIndex, state.swipeIndex + 3).reverse();
  if (!available.length) {
    deck.innerHTML = `<div class="empty-state"><strong>You reached the edge of Philly.</strong><p>Everyone you saw remains available in People.</p><button class="btn" data-reset-deck>Start again</button></div>`;
    $("[data-reset-deck]", deck).addEventListener("click", () => { state.swipeIndex = 0; renderSwipeDeck(); });
    return;
  }
  deck.innerHTML = available.map((profile, reversedIndex) => {
    const isTop = reversedIndex === available.length - 1;
    const track = profile.currentTrack || { name:`${profile.topArtists[0]} radio`, artist:"Recently played" };
    return `<article class="swipe-card" ${isTop ? `data-swipe-card data-username="${escapeHtml(profile.username)}"` : ""} style="--card-a:${profile.palette[0]};--card-b:${profile.palette[2]}">
      <div class="swipe-art">
        <span class="swipe-match">${compatibility(profile)}% aligned</span>
        <span class="avatar swipe-avatar" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
      </div>
      <div class="swipe-copy">
        <div class="swipe-name-row"><h3>${escapeHtml(profile.name)}</h3><span>${distanceMiles(profile).toFixed(1)} mi · ${escapeHtml(profile.location.neighborhood)}</span></div>
        <p class="swipe-handle">@${escapeHtml(profile.username)} · ${titleCase(profile.privacyMode)}</p>
        <p class="swipe-bio">${escapeHtml(profile.bio)}</p>
        <div class="swipe-track"><small>${profile.status === "listening" ? "listening now" : "on their wavelength"}</small><strong>${escapeHtml(track.name)} · ${escapeHtml(track.artist)}</strong></div>
        <div class="swipe-tags">${profile.topArtists.slice(0,3).map(a => `<span>${escapeHtml(a)}</span>`).join("")}</div>
      </div>
    </article>`;
  }).join("");
  enableCardDrag();
}

function actOnSwipe(direction) {
  const card = $("[data-swipe-card]");
  const profile = state.swipeQueue[state.swipeIndex];
  if (!card || !profile) return;
  card.classList.add(direction === "connect" ? "fly-right" : "fly-left");
  if (direction === "connect") {
    state.following.add(profile.username);
    toast(`You and ${profile.name} are now connected ✦`);
  }
  setTimeout(() => { state.swipeIndex++; renderSwipeDeck(); renderProfiles(); }, 330);
}

function enableCardDrag() {
  const card = $("[data-swipe-card]");
  if (!card) return;
  let dragging = false, startX = 0, deltaX = 0;
  card.addEventListener("pointerdown", event => {
    dragging = true; startX = event.clientX; deltaX = 0;
    card.setPointerCapture(event.pointerId); card.classList.add("dragging");
  });
  card.addEventListener("pointermove", event => {
    if (!dragging) return;
    deltaX = event.clientX - startX;
    card.style.transform = `translateX(${deltaX}px) rotate(${deltaX / 18}deg)`;
  });
  const finish = () => {
    if (!dragging) return;
    dragging = false;
    card.classList.remove("dragging"); card.style.transform = "";
    if (Math.abs(deltaX) > 85) actOnSwipe(deltaX > 0 ? "connect" : "pass");
  };
  card.addEventListener("pointerup", finish);
  card.addEventListener("pointercancel", finish);
}

function renderConversations(query = "") {
  const list = $("#conversation-list");
  const items = state.conversations.filter(c => `${c.profile.name} ${c.profile.username}`.toLowerCase().includes(query.toLowerCase()));
  list.innerHTML = items.map((conversation, index) => `<article class="conversation" data-conversation="${conversation.profile.username}">
    <span class="avatar" style="${paletteStyle(conversation.profile)}">${escapeHtml(conversation.profile.initials)}</span>
    <div class="conversation-copy"><div class="conversation-top"><strong>${escapeHtml(conversation.profile.name)}</strong><time>${conversation.time}</time></div><p>${escapeHtml(conversation.preview)}</p></div>
    ${conversation.unread ? `<i class="unread-dot"></i>` : `<span></span>`}
  </article>`).join("");
  $$("[data-conversation]", list).forEach(item => item.addEventListener("click", () => openConversation(item.dataset.conversation)));
  updateUnreadBadge();
}

function updateUnreadBadge() {
  const badge = $("[data-unread-badge]");
  if (!badge) return;
  const unread = state.conversations.filter(c => c.unread).length;
  badge.hidden = unread === 0;
  badge.textContent = unread;
}

function openConversation(username) {
  const conversation = state.conversations.find(c => c.profile.username === username);
  if (!conversation) return;
  conversation.unread = false;
  updateUnreadBadge();
  const p = conversation.profile;
  const sheet = document.createElement("section");
  sheet.className = "chat-sheet";
  sheet.innerHTML = `<header class="chat-head"><button data-close-chat>‹</button><span class="avatar small" style="${paletteStyle(p)}">${escapeHtml(p.initials)}</span><div class="chat-head-copy"><strong>${escapeHtml(p.name)}</strong><span>${p.status === "listening" ? "● listening now" : "last here recently"}</span></div><button data-chat-profile>•••</button></header>
    <div class="chat-stage">${conversation.messages.map(m => `<div class="bubble ${m.mine ? "me" : ""} ${m.track ? "shared-track" : ""}">${m.track ? "♫ &nbsp;" : ""}${escapeHtml(m.text)}</div>`).join("")}</div>
    <form class="chat-compose"><input aria-label="Message" placeholder="Message ${escapeHtml(p.name.split(" ")[0])}…"><button aria-label="Send">↑</button></form>`;
  $(".phone").appendChild(sheet);
  $("[data-close-chat]", sheet).addEventListener("click", () => { sheet.remove(); renderConversations($("#message-search").value); });
  $("[data-chat-profile]", sheet).addEventListener("click", () => { sheet.remove(); openProfile(username); });
  $(".chat-compose", sheet).addEventListener("submit", event => {
    event.preventDefault(); const input = $("input", event.currentTarget); if (!input.value.trim()) return;
    conversation.messages.push({mine:true,text:input.value.trim()});
    $(".chat-stage", sheet).insertAdjacentHTML("beforeend", `<div class="bubble me">${escapeHtml(input.value.trim())}</div>`);
    input.value = ""; $(".chat-stage", sheet).scrollTop = 99999;
  });
}

function distanceMiles(profile) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const lat1 = toRadians(CURRENT_USER.latitude);
  const lat2 = toRadians(profile.location.latitude);
  const deltaLat = toRadians(profile.location.latitude - CURRENT_USER.latitude);
  const deltaLon = toRadians(profile.location.longitude - CURRENT_USER.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function radarPosition(profile) {
  // Location coordinates remain backend-only. The UI receives a distance band
  // and a stable decorative angle, never a person's actual direction or point.
  const miles = distanceMiles(profile);
  const bandFloor = miles <= 5 ? 0.16 : miles <= 10 ? 0.36 : 0.61;
  const bandCeiling = miles <= 5 ? 0.31 : miles <= 10 ? 0.53 : 0.84;
  const hash = [...profile.username].reduce((sum,char,index) => sum + char.charCodeAt(0) * (index + 7), 0);
  const angle = (hash % 360) * Math.PI / 180;
  const normalizedRadius = bandFloor + ((hash % 97) / 97) * (bandCeiling - bandFloor);
  const radius = normalizedRadius * 50;
  return {
    x: Math.max(5, Math.min(95, 50 + Math.cos(angle) * radius)),
    y: Math.max(5, Math.min(95, 50 + Math.sin(angle) * radius))
  };
}

function liveRadarProfiles() {
  return state.profiles
    .filter((profile) =>
      !state.severed.has(profile.username) &&
      profile.status !== "private" &&
      ["listening", "in-session"].includes(profile.status) &&
      profile.currentTrack &&
      distanceMiles(profile) <= state.radiusMiles
    )
    .sort((a, b) => compatibility(b) - compatibility(a));
}

function spreadRadarPosition(profile, index, placedPositions) {
  const position = radarPosition(profile);
  let attempt = 0;
  const overlaps = () => placedPositions.some((placed) =>
    Math.hypot(position.x - placed.x, position.y - placed.y) < 7
  );
  while (overlaps() && attempt < 10) {
    const angle = (index * 137.5 + attempt * 61) * Math.PI / 180;
    const distance = 4.5 + attempt * .65;
    position.x = Math.max(5, Math.min(95, position.x + Math.cos(angle) * distance));
    position.y = Math.max(5, Math.min(95, position.y + Math.sin(angle) * distance));
    attempt++;
  }
  placedPositions.push(position);
  return position;
}

function renderRadar() {
  const profiles = liveRadarProfiles();
  const pingLayer = $("#radar-pings");
  const placedPositions = [];
  $("#radar-live-count").textContent = `${profiles.length} live signal${profiles.length === 1 ? "" : "s"}`;
  $("#radar-radius-label").textContent = `within ${state.radiusMiles} miles`;
  pingLayer.innerHTML = profiles.map((profile, index) => {
    const position = spreadRadarPosition(profile, index, placedPositions);
    const match = compatibility(profile);
    const size = 17 + Math.round((match - 60) * .2) + (profile.status === "in-session" ? 4 : 0);
    const selected = state.selectedPing === profile.username;
    return `
      <button
        class="listener-ping ${profile.status} ${selected ? "selected" : ""}"
        data-ping="${escapeHtml(profile.username)}"
        aria-label="${escapeHtml(profile.name)}, ${distanceMiles(profile).toFixed(1)} miles away, listening to ${escapeHtml(profile.currentTrack.name)}, ${match}% match"
        style="left:${position.x}%;top:${position.y}%;--accent:${profile.palette[0]};--ping-size:${size}px;--delay:-${(index % 6) * .35}s"
      ></button>`;
  }).join("");
  $$(".listener-ping", pingLayer).forEach((ping) => {
    ping.addEventListener("click", () => selectRadarPing(ping.dataset.ping));
  });

  if (state.selectedPing && !profiles.some((profile) => profile.username === state.selectedPing)) {
    state.selectedPing = null;
    renderRadarPreview(null);
  }
}

function selectRadarPing(username) {
  state.selectedPing = state.selectedPing === username ? null : username;
  renderRadar();
  renderRadarPreview(state.selectedPing ? state.profiles.find((profile) => profile.username === username) : null);
}

function renderRadarPreview(profile) {
  const preview = $("#radar-preview");
  if (!profile) {
    preview.innerHTML = `<p class="empty-preview">Tap a live signal to hear what Philadelphia is listening to.</p>`;
    return;
  }
  const actionLabel = profile.privacyMode === "open-door" ? "Join now" : "Knock first";
  preview.innerHTML = `
    <article class="signal-card">
      <div class="signal-head">
        <span class="avatar small" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
        <div>
          <p class="signal-name">${escapeHtml(profile.name)}</p>
          <p class="signal-meta">${distanceMiles(profile).toFixed(1)} mi · ${escapeHtml(profile.location.neighborhood)} · ${titleCase(profile.privacyMode)}</p>
        </div>
        <span class="signal-match">${compatibility(profile)}%</span>
      </div>
      <p class="signal-track">${escapeHtml(profile.currentTrack.name)} · ${escapeHtml(profile.currentTrack.artist)}</p>
      <div class="signal-actions">
        <button class="btn" data-radar-profile>View profile</button>
        <button class="btn primary" data-radar-action>${actionLabel}</button>
      </div>
    </article>`;
  $("[data-radar-profile]", preview).addEventListener("click", () => openProfile(profile.username));
  $("[data-radar-action]", preview).addEventListener("click", () => handlePrimaryAction(profile));
}

function paletteStyle(profile) {
  const [accent = "#9BA0FA", secondary = "#242A3E"] = profile.palette;
  return `--accent:${accent};--accent-soft:${accent}33;background:linear-gradient(145deg,${accent},${secondary})`;
}

function stateLabel(profile) {
  if (profile.status === "in-session") return "in session";
  if (profile.status === "listening") return "listening";
  if (profile.status === "private") return "private";
  return "offline";
}

function filteredProfiles() {
  const query = state.search.trim().toLowerCase();
  return state.profiles
    .filter((profile) => {
      if (state.severed.has(profile.username)) return false;
      if (state.filter === "live" && !["listening", "in-session"].includes(profile.status)) return false;
      if (state.filter === "sessions" && profile.status !== "in-session") return false;
      if (state.filter === "following" && !state.following.has(profile.username)) return false;
      if (!query) return true;
      return [
        profile.name,
        profile.username,
        profile.location.neighborhood,
        ...profile.topArtists
      ].some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const priority = { "in-session": 0, listening: 1, offline: 2, private: 3 };
      return priority[a.status] - priority[b.status] || compatibility(b) - compatibility(a);
    });
}

function renderProfiles() {
  const profiles = filteredProfiles();
  const list = $("#profile-list");
  list.innerHTML = profiles.length ? profiles.map((profile) => `
    <button class="profile-card" data-profile="${escapeHtml(profile.username)}">
      <span class="avatar" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
      <span class="profile-copy">
        <span class="profile-name">
          ${escapeHtml(profile.name)}
          <span class="state ${profile.status}">${stateLabel(profile)}</span>
        </span>
        <span class="profile-handle">@${escapeHtml(profile.username)} · ${escapeHtml(profile.location.neighborhood)}</span>
        ${profile.currentTrack ? `<span class="profile-track">${escapeHtml(profile.currentTrack.name)} · ${escapeHtml(profile.currentTrack.artist)}</span>` : ""}
      </span>
      <span class="profile-score">${compatibility(profile)}%</span>
    </button>
  `).join("") : `<p class="empty">No listeners match this view.</p>`;

  $$(".profile-card", list).forEach((card) => {
    card.addEventListener("click", () => openProfile(card.dataset.profile));
  });
}

function renderActivity() {
  const active = state.profiles.filter((profile) => ["listening", "in-session"].includes(profile.status));
  const events = [
    ...active.slice(0, 5).map((profile, index) => ({
      profile,
      text: profile.status === "in-session"
        ? `<strong>${escapeHtml(profile.name)}</strong> started a shared session in ${escapeHtml(profile.location.neighborhood)}.`
        : `<strong>${escapeHtml(profile.name)}</strong> is listening to ${escapeHtml(profile.currentTrack.name)}.`,
      time: `${index * 2 + 1} min ago`
    })),
    ...state.profiles.slice(15, 19).map((profile, index) => ({
      profile,
      text: `<strong>${escapeHtml(profile.name)}</strong> created a memory anchor with a friend.`,
      time: `${index * 7 + 12} min ago`
    }))
  ];
  $("#activity-feed").innerHTML = events.map(({ profile, text, time }) => `
    <article class="activity-item">
      <span class="avatar small" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
      <div><p>${text}</p><time>${time}</time></div>
    </article>
  `).join("");
}

function renderHome() {
  const live = state.profiles
    .filter(profile => ["listening","in-session"].includes(profile.status) && profile.currentTrack)
    .sort((a,b) => compatibility(b) - compatibility(a));
  $("#live-session-rail").innerHTML = live.slice(0,6).map(profile => `
    <article class="live-session-card" data-home-session="${escapeHtml(profile.username)}">
      <div class="live-session-top">
        <span class="avatar small" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
        <div><strong>${escapeHtml(profile.name)}</strong><p>${escapeHtml(profile.location.neighborhood)} · ${titleCase(profile.privacyMode)}</p></div>
        <span class="join-chip">${profile.privacyMode === "open-door" ? "Join" : "Knock"}</span>
      </div>
      <div class="mini-track"><span class="mini-art" style="--a:${profile.palette[0]};--b:${profile.palette[2]}"></span><div><strong>${escapeHtml(profile.currentTrack.name)}</strong><p>${escapeHtml(profile.currentTrack.artist)} · synced live</p></div></div>
    </article>`).join("");
  $("#home-match-list").innerHTML = [...state.profiles]
    .filter(profile => profile.privacyMode !== "ghost")
    .sort((a,b) => compatibility(b) - compatibility(a)).slice(0,3)
    .map(profile => `<article class="home-match" data-home-profile="${escapeHtml(profile.username)}">
      <span class="avatar small" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
      <div><strong>${escapeHtml(profile.name)}</strong><p>${escapeHtml(profile.topArtists.slice(0,2).join(" · "))} · ${distanceMiles(profile).toFixed(0)} mi band</p></div>
      <span class="match-score">${compatibility(profile)}%</span>
    </article>`).join("");
  $$("[data-home-session]").forEach(card => card.addEventListener("click", () => {
    const profile = profileByUsername(card.dataset.homeSession);
    if (profile) handlePrimaryAction(profile);
  }));
  $$("[data-home-profile]").forEach(card => card.addEventListener("click", () => openProfile(card.dataset.homeProfile)));
}

function renderReviews() {
  $("#review-feed").innerHTML = reviews.map((review,index) => {
    const profile = profileByUsername(review.username) || state.profiles[index];
    const whole = Math.floor(review.score);
    const stars = "★".repeat(whole) + (review.score % 1 ? "½" : "");
    return `<article class="review-card">
      <header class="review-head"><span class="avatar small" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
        <div><strong>${escapeHtml(profile.name)}</strong><p>reviewed a${review.type === "artist" ? "n" : ""} ${review.type}</p></div><time>${review.time}</time></header>
      <div class="review-subject"><span class="review-cover" style="--a:${profile.palette[0]};--b:${profile.palette[2]}">♫</span>
        <div><h3>${escapeHtml(review.title)}</h3><p class="track-artist">${escapeHtml(review.artist)}</p><span class="stars">${stars}</span><small> ${review.score}/5</small></div></div>
      <p class="review-body">${escapeHtml(review.body)}</p>
      <footer class="review-actions"><button data-rate-review="${index}">☆ Rate this review · ${review.reviewRating}</button><button data-review-reply="${index}">Reply</button><button data-review-session="${review.username}">Listen</button></footer>
    </article>`;
  }).join("");
  $$("[data-rate-review]").forEach(button => button.addEventListener("click", () => {
    const index = Number(button.dataset.rateReview);
    const review = reviews[index];
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Rate the criticism</p><h3>Was this review useful?</h3></div><button class="icon-button" data-close-modal>×</button></div>
      <p class="modal-copy">Rate the quality of the review—not whether you agree with its opinion of ${escapeHtml(review.title)}.</p>
      <div class="review-rating-picker">${[1,2,3,4,5].map(score=>`<button data-review-score="${score}"><span>${"★".repeat(score)}</span><small>${score}.0</small></button>`).join("")}</div>`);
    $$("[data-review-score]",$("#feature-modal")).forEach(scoreButton => scoreButton.addEventListener("click", () => {
      const score = Number(scoreButton.dataset.reviewScore);
      closeFeatureModal();
      button.classList.add("rated"); button.textContent = `★ You rated this review ${score}.0`;
      toast("Review rating saved.");
    }));
  }));
  $$("[data-review-reply]").forEach(button => button.addEventListener("click", () => {
    const review = reviews[Number(button.dataset.reviewReply)];
    const profile = profileByUsername(review.username);
    if (profile) openConversation(profile.username);
  }));
  $$("[data-review-session]").forEach(button => button.addEventListener("click", () => {
    const profile = profileByUsername(button.dataset.reviewSession);
    if (profile?.currentTrack) handlePrimaryAction(profile); else toast("This listening session has ended.");
  }));
}

function chooseMusicService() {
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Music account</p><h3>Choose your player</h3></div><button class="icon-button" data-close-modal>×</button></div>
    <p class="modal-copy">Tether coordinates playback through your existing subscription. It never hosts or redistributes the audio.</p>
    <div class="option-list">
      ${["Spotify","Apple Music","YouTube Music"].map(name => `<button class="option-button ${state.musicService===name?"active":""}" data-music-service="${name}"><span class="service-dot ${name==="Spotify"?"spotify":name==="Apple Music"?"apple":"youtube"}"></span><span>${name}</span><span>${state.musicService===name?"Connected":"Connect"}</span></button>`).join("")}
    </div>`);
  $$("[data-music-service]",$("#feature-modal")).forEach(button => button.addEventListener("click", () => {
    state.musicService = button.dataset.musicService;
    const pill = $("[data-service-picker]"); $("strong",pill).textContent = state.musicService;
    $(".service-dot",pill).className = `service-dot ${state.musicService==="Spotify"?"spotify":state.musicService==="Apple Music"?"apple":"youtube"}`;
    closeFeatureModal(); toast(`${state.musicService} connected.`);
  }));
}

function chooseOwnTrack() {
  const tracks = [
    {name:"A Walk Along the Delaware",artist:"The Pennsport Assembly",album:"River Light",durationSeconds:247,progressPercent:18},
    {name:"Second Coffee",artist:"Remi Wolf",album:"Big Ideas",durationSeconds:214,progressPercent:9},
    {name:"Holocene",artist:"Bon Iver",album:"Bon Iver",durationSeconds:337,progressPercent:31}
  ];
  openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">${state.musicService}</p><h3>Start your stage</h3></div><button class="icon-button" data-close-modal>×</button></div>
    <p class="modal-copy">Pick a demo track. In the live app, starting playback in ${state.musicService} automatically opens this stage.</p>
    <div class="option-list">${tracks.map((track,index)=>`<button class="option-button" data-own-track="${index}"><span>♫</span><span><strong>${track.name}</strong><small>${track.artist}</small></span><span>Play</span></button>`).join("")}</div>`);
  $$("[data-own-track]",$("#feature-modal")).forEach(button => button.addEventListener("click", () => {
    const track = tracks[Number(button.dataset.ownTrack)];
    closeFeatureModal();
    startSession({name:"John Roastpork",first:"John",username:"john.roastpork",initials:"JR",palette:["#9BA0FA","#333B61","#77B7F0"],privacyMode:state.userPrivacy,status:"listening",location:{neighborhood:"Pennsport"},currentTrack:track});
  }));
}

function openWavelengthOnboarding(step = 0) {
  state.wavelengthStep = step;
  const p = state.wavelengthProfile;
  const steps = p.goal === "dating" ? 4 : 3;
  let body = "";
  if (step === 0) body = `
    <div class="onboard-step"><p class="eyebrow">Wavelength setup</p><h2>First, the basics.</h2>
    <p class="sub">Only information you choose to display appears on your card. Height and weight are always optional.</p>
    <div class="onboard-fields"><label class="field-label">Gender
      <select class="field-control" data-onboard-gender><option value="">Skip</option>${["Man","Woman","Nonbinary","Other"].map(v=>`<option ${p.gender===v?"selected":""}>${v}</option>`).join("")}</select></label>
      <label class="field-label" data-custom-gender-wrap style="${p.gender==="Other"?"":"display:none"}">Your gender<input class="field-control" data-custom-gender value="${escapeHtml(p.customGender)}" placeholder="Agender, bigender…"></label>
      <div class="optional-pair"><label class="field-label">Height · optional<input class="field-control" data-height value="${escapeHtml(p.height)}" placeholder="5′ 10″"></label>
      <label class="field-label">Weight · optional<input class="field-control" data-weight value="${escapeHtml(p.weight)}" placeholder="Skip"></label></div></div></div>`;
  if (step === 1) body = `
    <div class="onboard-step"><p class="eyebrow">What brings you here?</p><h2>Choose your frequency.</h2><p class="sub">Friendship and dating are separate pools. You can change this later without rebuilding your music profile.</p>
    <div class="option-grid"><button data-goal="friends" class="${p.goal==="friends"?"selected":""}"><strong>Find friends</strong><br><small>Meet people to share music and sessions with.</small></button>
    <button data-goal="dating" class="${p.goal==="dating"?"selected":""}"><strong>Date through music</strong><br><small>Mutual romantic discovery with compatibility controls.</small></button></div></div>`;
  if (step === 2 && p.goal === "dating") body = `
    <div class="onboard-step"><p class="eyebrow">Dating compatibility</p><h2>Who should find you?</h2><p class="sub">Orientation is used to form mutually compatible pools before music matching. It is never inferred from listening behavior.</p>
    <div class="option-grid">${["Straight","Gay","Bisexual","Queer / open"].map(v=>`<button data-orientation="${v}" class="${p.orientation===v?"selected":""}">${v}</button>`).join("")}</div>
    <div class="privacy-promise"><span>◉</span><span>Your exact location is never shown. Wavelength exposes only broad distance bands such as “within 5 miles.”</span></div></div>`;
  const artistStep = p.goal === "dating" ? 3 : 2;
  if (step === artistStep) body = `
    <div class="onboard-step"><p class="eyebrow">Tune your matches</p><h2>Set your musical poles.</h2><p class="sub">An exclusion applies only when that artist is a sustained top affinity. One or two casual plays never hide somebody.</p>
    <div class="onboard-fields"><label class="field-label">Artist you cannot stand · optional<input class="field-control" data-avoid-artist value="${escapeHtml(p.avoidArtist)}" placeholder="Search or skip"></label>
    <label class="field-label">Priority artist · optional<input class="field-control" data-priority-artist value="${escapeHtml(p.priorityArtist)}" placeholder="Who do you want to bond over?"></label></div>
    <div class="artist-search-results"><button class="artist-option" data-demo-artist="Melanie Martinez" data-kind="avoid"><span>Melanie Martinez</span><small>exclude top listeners</small></button>
    <button class="artist-option" data-demo-artist="Japanese Breakfast" data-kind="priority"><span>Japanese Breakfast</span><small>prioritize fans</small></button></div></div>`;
  openFeatureModal(`<div class="onboarding"><button class="icon-button" data-close-modal aria-label="Close">×</button>
    <div class="onboard-progress">${Array.from({length:steps},(_,i)=>`<i class="${i<=step?"done":""}"></i>`).join("")}</div>${body}
    <div class="onboard-footer"><button data-onboard-back>${step===0?"Not now":"Back"}</button><button class="next" data-onboard-next>${step===steps-1?"Enter Wavelength":"Continue"}</button></div></div>`);
  const modal = $("#feature-modal");
  const gender = $("[data-onboard-gender]",modal);
  if (gender) gender.addEventListener("change", () => {
    p.gender = gender.value; $("[data-custom-gender-wrap]",modal).style.display = gender.value === "Other" ? "grid" : "none";
  });
  $$("[data-goal]",modal).forEach(b=>b.addEventListener("click",()=>{p.goal=b.dataset.goal; openWavelengthOnboarding(1);}));
  $$("[data-orientation]",modal).forEach(b=>b.addEventListener("click",()=>{p.orientation=b.dataset.orientation; openWavelengthOnboarding(2);}));
  $$("[data-demo-artist]",modal).forEach(b=>b.addEventListener("click",()=>{
    if(b.dataset.kind==="avoid") p.avoidArtist=b.dataset.demoArtist; else p.priorityArtist=b.dataset.demoArtist;
    b.classList.add("selected");
  }));
  $("[data-onboard-back]",modal).addEventListener("click",()=>{
    if(step===0) closeFeatureModal(); else openWavelengthOnboarding(step-1);
  });
  $("[data-onboard-next]",modal).addEventListener("click",()=>{
    if(step===0){p.gender=gender.value;p.customGender=$("[data-custom-gender]",modal)?.value||"";p.height=$("[data-height]",modal).value;p.weight=$("[data-weight]",modal).value;}
    if(step===artistStep){p.avoidArtist=$("[data-avoid-artist]",modal).value;p.priorityArtist=$("[data-priority-artist]",modal).value;}
    if(step === steps-1){state.wavelengthReady=true;rebuildWavelengthQueue();closeFeatureModal();switchView("discover",true);toast(`${p.goal==="dating"?"Dating":"Friend"} Wavelength tuned.`);}
    else openWavelengthOnboarding(step+1);
  });
}

function profileByUsername(username) {
  return state.profiles.find((profile) => profile.username === username);
}

function renderAnchors() {
  $("#anchor-feed").innerHTML = anchors.map((anchor) => {
    const profile = profileByUsername(anchor.username);
    if (!profile) return "";
    return `
      <article class="anchor-card">
        <div class="anchor-head">
          <div class="anchor-person">
            <span class="avatar small" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
            <div><strong>${escapeHtml(profile.name)}</strong><small>${escapeHtml(anchor.date)}</small></div>
          </div>
          ${anchor.mood ? `<span class="mood-tag">${escapeHtml(anchor.mood)}</span>` : `<span class="mood-tag">Add mood</span>`}
        </div>
        <p class="anchor-track">${escapeHtml(anchor.track)}</p>
        <p class="anchor-meta">${escapeHtml(anchor.artist)} · ${anchor.minutes} min · ${escapeHtml(anchor.distance)}</p>
        <div class="health-bar"><span style="width:${anchor.health}%"></span></div>
        ${anchor.mood ? "" : `
          <div class="mood-picker">
            ${MOODS.map((mood) => `<button data-anchor-mood="${anchor.id}" data-mood="${mood}">${mood}</button>`).join("")}
          </div>`}
      </article>`;
  }).join("");
  $$("[data-anchor-mood]").forEach((button) => button.addEventListener("click", () => {
    const anchor = anchors.find((item) => item.id === button.dataset.anchorMood);
    if (!anchor) return;
    anchor.mood = button.dataset.mood;
    renderAnchors();
    toast(`Tagged ${anchor.track} as ${anchor.mood}.`);
  }));
}

function renderCapsules() {
  $("#capsule-feed").innerHTML = capsules.map((capsule) => {
    const profile = profileByUsername(capsule.username);
    if (!profile) return "";
    const sealed = !capsule.opened;
    return `
      <article class="capsule-card ${sealed ? "sealed" : ""}">
        <div class="anchor-person">
          <span class="avatar small" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
          <div>
            <strong>${capsule.direction === "sent" ? `Sent to ${escapeHtml(profile.name)}` : `From ${escapeHtml(profile.name)}`}</strong>
            <small>${sealed ? "Sealed moment" : "Opened moment"}</small>
          </div>
        </div>
        <p class="capsule-track">${escapeHtml(capsule.track)}</p>
        <p class="capsule-meta">${escapeHtml(capsule.artist)}</p>
        <p class="capsule-lock">${sealed ? `◒ Unlocks: ${escapeHtml(capsule.lock)}` : "✦ Ready to play"}</p>
        <button class="btn" data-capsule="${capsule.id}">${sealed ? "Check condition" : "Open moment"}</button>
      </article>`;
  }).join("");
  $$("[data-capsule]").forEach((button) => button.addEventListener("click", () => {
    const capsule = capsules.find((item) => item.id === button.dataset.capsule);
    if (!capsule) return;
    if (!capsule.opened) {
      capsule.opened = true;
      renderCapsules();
      toast(`${capsule.lock} condition simulated — capsule unlocked.`);
    } else {
      toast(`Opening ${capsule.track} at the saved moment.`);
    }
  }));
}

function openFeatureModal(content) {
  const modal = $("#feature-modal");
  state.lastFocused = document.activeElement;
  modal.innerHTML = `<div class="modal-sheet" role="dialog" aria-modal="true">${content}</div>`;
  modal.classList.add("open");
  $$("[data-close-modal]", modal).forEach((button) => button.addEventListener("click", closeFeatureModal));
  const firstControl = $(".modal-sheet button, .modal-sheet input, .modal-sheet select", modal);
  if (firstControl) firstControl.focus();
}

function closeFeatureModal() {
  const modal = $("#feature-modal");
  modal.classList.remove("open");
  modal.innerHTML = "";
  if (state.lastFocused?.isConnected) state.lastFocused.focus();
  state.lastFocused = null;
}

// One Escape press closes the topmost layer, in stacking order.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const chatSheet = $(".chat-sheet");
  if ($("#feature-modal").classList.contains("open")) { closeFeatureModal(); return; }
  if (chatSheet) { chatSheet.remove(); renderConversations($("#message-search").value); updateUnreadBadge(); return; }
  if ($("#session-view").classList.contains("open")) { endSession(); return; }
  if ($("#profile-view").classList.contains("open")) { closeProfile(); return; }
});

// Arrow keys drive the Wavelength deck when it is on screen.
document.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  if (state.discoverMode !== "swipe") return;
  if (!$("#discover-view").classList.contains("active")) return;
  if ($("#feature-modal").classList.contains("open") || $(".chat-sheet")) return;
  if (/input|select|textarea/i.test(document.activeElement?.tagName || "")) return;
  actOnSwipe(event.key === "ArrowRight" ? "connect" : "pass");
});

function openFriendSettings(profile) {
  const transparent = state.transparentPresence.has(profile.username);
  const muted = state.muted.has(profile.username);
  openFeatureModal(`
    <div class="modal-head">
      <div><p class="eyebrow">Connection settings</p><h3>${escapeHtml(profile.name)}</h3></div>
      <button class="icon-button" data-close-modal aria-label="Close">×</button>
    </div>
    <div class="friend-actions">
      <button class="friend-action" data-transparent>
        <strong>Transparent Presence · ${transparent ? "On" : "Off"}</strong>
        <small>Mutual opt-in: show each other by name while actively listening.</small>
      </button>
      <button class="friend-action" data-mute>
        <strong>${muted ? "Unmute" : "Mute"} presence</strong>
        <small>Hide their presence signals and notifications without unfollowing.</small>
      </button>
      <button class="friend-action danger" data-sever>
        <strong>Sever connection</strong>
        <small>You become mutually invisible. No knocks, capsules, or signals.</small>
      </button>
    </div>`);
  $("[data-transparent]", $("#feature-modal")).addEventListener("click", () => {
    if (state.transparentPresence.has(profile.username)) state.transparentPresence.delete(profile.username);
    else state.transparentPresence.add(profile.username);
    closeFeatureModal();
    toast(`Transparent Presence ${state.transparentPresence.has(profile.username) ? "enabled" : "disabled"} with ${profile.name}.`);
  });
  $("[data-mute]", $("#feature-modal")).addEventListener("click", () => {
    if (state.muted.has(profile.username)) state.muted.delete(profile.username);
    else state.muted.add(profile.username);
    closeFeatureModal();
    toast(`${profile.name} ${state.muted.has(profile.username) ? "muted" : "unmuted"}.`);
  });
  $("[data-sever]", $("#feature-modal")).addEventListener("click", () => {
    state.severed.add(profile.username);
    state.following.delete(profile.username);
    closeFeatureModal();
    closeProfile();
    renderProfiles();
    renderRadar();
    toast(`Connection with ${profile.name} severed silently.`);
  });
}

function openCapsuleComposer(profile) {
  let selectedLock = "No lock";
  const track = profile.currentTrack || {
    name: "Under Market Street",
    artist: profile.topArtists[0]
  };
  openFeatureModal(`
    <div class="modal-head">
      <div><p class="eyebrow">Leave a moment</p><h3>For ${escapeHtml(profile.name)}</h3></div>
      <button class="icon-button" data-close-modal aria-label="Close">×</button>
    </div>
    <p class="modal-copy">The song starts at the exact moment John chose. Add one environmental lock, or leave it open.</p>
    <section class="panel">
      <p class="track-title">${escapeHtml(track.name)}</p>
      <p class="track-artist">${escapeHtml(track.artist)} · starts at 2:36</p>
    </section>
    <div class="option-list">
      <button class="option-button active" data-lock="No lock"><span>✦</span><span>No lock</span><span>›</span></button>
      <button class="option-button" data-lock="After midnight"><span>◒</span><span>After midnight</span><span>›</span></button>
      <button class="option-button" data-lock="When it rains"><span>☂</span><span>When it rains</span><span>›</span></button>
      <button class="option-button" data-lock="On Friday"><span>□</span><span>Choose a date</span><span>›</span></button>
      <button class="option-button" data-lock="Back in Pennsport"><span>⌖</span><span>Return to this place</span><span>›</span></button>
    </div>
    <button class="btn primary" style="width:100%" data-send-capsule>Drop it →</button>`);
  $$("[data-lock]", $("#feature-modal")).forEach((button) => button.addEventListener("click", () => {
    selectedLock = button.dataset.lock;
    $$("[data-lock]", $("#feature-modal")).forEach((item) => item.classList.toggle("active", item === button));
  }));
  $("[data-send-capsule]", $("#feature-modal")).addEventListener("click", () => {
    capsules.unshift({
      id: `c${Date.now()}`,
      username: profile.username,
      track: track.name,
      artist: track.artist,
      lock: selectedLock,
      opened: selectedLock === "No lock",
      direction: "sent"
    });
    renderCapsules();
    closeFeatureModal();
    toast(`Moment left for ${profile.name}${selectedLock === "No lock" ? "." : ` · ${selectedLock}.`}`);
  });
}

function openSparkDemo() {
  openFeatureModal(`
    <div class="modal-head">
      <div><p class="eyebrow">Physical ritual</p><h3>Tap to Tether</h3></div>
      <button class="icon-button" data-close-modal aria-label="Close">×</button>
    </div>
    <p class="modal-copy">On a real device, John would hold phones near each other. This simulates exchanging the one-time NFC Spark token.</p>
    <div class="spark-rings"><span class="spark-icon">✦</span></div>
    <button class="btn primary" style="width:100%" data-simulate-spark>Simulate phone tap</button>`);
  $("[data-simulate-spark]", $("#feature-modal")).addEventListener("click", (event) => {
    const profile = state.profiles.find((item) => item.username === "x_patricia_x") || state.profiles[0];
    state.following.add(profile.username);
    event.currentTarget.textContent = `Connected with ${profile.name} ✦`;
    event.currentTarget.disabled = true;
    renderProfiles();
    setTimeout(closeFeatureModal, 1400);
  });
}

function openProfile(username) {
  const profile = state.profiles.find((item) => item.username === username);
  if (!profile) return;
  state.selected = profile;
  const view = $("#profile-view");
  const isFollowing = state.following.has(profile.username);
  const actionLabel = profile.status === "in-session" || profile.status === "listening"
    ? profile.privacyMode === "open-door" ? "Join session" : "Knock to join"
    : profile.status === "private" ? "Ghost mode" : "Leave a moment";
  const actionDisabled = profile.status === "private";
  const track = profile.currentTrack;
  const vibeLabels = [
    ["V", profile.vibe.valence, "valence"],
    ["E", profile.vibe.energy, "energy"],
    ["D", profile.vibe.danceability, "dance"],
    ["A", profile.vibe.acousticness, "acoustic"]
  ];
  view.style.setProperty("--accent", profile.palette[0]);
  view.style.setProperty("--accent-soft", `${profile.palette[0]}33`);
  view.innerHTML = `
    <div class="overlay-header">
      <button class="icon-button" data-close-profile aria-label="Back">‹</button>
      <button class="icon-button" data-more aria-label="More options">···</button>
    </div>
    <div class="profile-hero">
      <div class="avatar xl" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</div>
      <p class="eyebrow">${compatibility(profile)}% vibe match</p>
      <h2>${escapeHtml(profile.name)}</h2>
      <p class="handle">@${escapeHtml(profile.username)} · ${profile.followerCount} followers</p>
      <p class="bio">${escapeHtml(profile.bio)}</p>
      <span class="location">⌖ ${escapeHtml(profile.location.neighborhood)} · Philadelphia</span>
      <div class="action-row">
        <button class="btn" data-follow>${isFollowing ? "Following" : "Follow"}</button>
        <button class="btn" data-message>Message</button>
        <button class="btn primary" data-session ${actionDisabled ? "disabled" : ""}>${actionLabel}</button>
      </div>
    </div>
    <div class="profile-content">
      ${track ? `
        <section class="panel">
          <p class="panel-title">Listening now</p>
          <div class="now-track">
            <div class="album-art"></div>
            <div>
              <p class="track-title">${escapeHtml(track.name)}</p>
              <p class="track-artist">${escapeHtml(track.artist)} · ${escapeHtml(track.album)}</p>
              <div class="progress"><span style="width:${track.progressPercent}%"></span></div>
            </div>
          </div>
        </section>` : `
        <section class="panel">
          <p class="panel-title">Listening status</p>
          <p class="bio">${profile.status === "private" ? "Listening privately in Ghost Mode." : "Offline right now. You can still leave a musical moment."}</p>
        </section>`}
      <section class="panel">
        <p class="panel-title">Vibe signature</p>
        <div class="vibe-row">
          ${vibeLabels.map(([letter, value, label]) => `
            <div class="vibe-item">
              <div class="vibe-ring" style="--value:${Math.round(value * 100)}%" data-label="${letter}"></div>
              <small>${label}</small>
            </div>`).join("")}
        </div>
      </section>
      <section class="panel">
        <p class="panel-title">Top artists</p>
        <div class="artists">${profile.topArtists.map((artist) => `<span class="artist-chip">${escapeHtml(artist)}</span>`).join("")}</div>
      </section>
      <section class="panel">
        <p class="panel-title">Tether history</p>
        <div class="metric-grid">
          <div><strong>${profile.metrics.sessionsJoined}</strong><span>sessions joined</span></div>
          <div><strong>${profile.metrics.totalTetheredMinutes.toLocaleString()}</strong><span>minutes tethered</span></div>
          <div><strong>${profile.metrics.capsulesSent}</strong><span>capsules sent</span></div>
          <div><strong>${profile.metrics.memoryAnchors}</strong><span>memory anchors</span></div>
          <div><strong>${profile.metrics.longestSharedSessionMinutes}m</strong><span>longest session</span></div>
          <div><strong>${profile.metrics.listeningStreakDays}d</strong><span>listening streak</span></div>
        </div>
      </section>
      <section class="panel">
        <p class="panel-title">Connection</p>
        <div class="recap-row"><span>Privacy</span><strong>${titleCase(profile.privacyMode)}</strong></div>
        <div class="recap-row"><span>Streaming</span><strong>${escapeHtml(profile.streamingService)}</strong></div>
        <div class="recap-row"><span>Following</span><strong>${profile.followingCount}</strong></div>
        <div class="recap-row"><span>Joined Tether</span><strong>${escapeHtml(profile.dateJoined)}</strong></div>
      </section>
    </div>`;
  view.classList.add("open");
  $("[data-close-profile]", view).addEventListener("click", closeProfile);
  $("[data-more]", view).addEventListener("click", () => openFriendSettings(profile));
  $("[data-follow]", view).addEventListener("click", () => toggleFollow(profile));
  $("[data-message]", view).addEventListener("click", () => {
    closeProfile();
    if (!state.conversations.some(c => c.profile.username === profile.username)) {
      state.conversations.unshift({profile, preview:"Start a conversation", time:"Now", unread:false, messages:[]});
    }
    openConversation(profile.username);
  });
  const sessionButton = $("[data-session]", view);
  if (!sessionButton.disabled) sessionButton.addEventListener("click", () => handlePrimaryAction(profile));
}

function closeProfile() {
  $("#profile-view").classList.remove("open");
  state.selected = null;
}

function toggleFollow(profile) {
  if (state.following.has(profile.username)) state.following.delete(profile.username);
  else state.following.add(profile.username);
  $("[data-follow]", $("#profile-view")).textContent = state.following.has(profile.username) ? "Following" : "Follow";
  renderProfiles();
  toast(state.following.has(profile.username) ? `Following ${profile.name}` : `Unfollowed ${profile.name}`);
}

function handlePrimaryAction(profile) {
  if (profile.status === "offline") {
    closeProfile();
    openCapsuleComposer(profile);
    return;
  }
  if (profile.privacyMode === "knock-first") {
    const button = $("[data-session]", $("#profile-view")) || $("[data-radar-action]", $("#radar-preview"));
    if (button) {
      button.disabled = true;
      button.textContent = "Knocking…";
    }
    toast(`Knock sent to ${profile.name}`);
    setTimeout(() => startSession(profile), 900);
  } else {
    startSession(profile);
  }
}

// Session implementation.
function startSession(profile) {
  state.session = profile;
  state.sessionPaused = false;
  state.sessionStartedAt = Date.now();
  state.pulseReady = false;
  state.pulsesThisSession = 0;
  closeProfile();
  const view = $("#session-view");
  const track = profile.currentTrack;
  const companion = state.profiles.find((item) =>
    item.username !== profile.username && item.status === "in-session"
  );
  view.style.setProperty("--accent", profile.palette[0]);
  view.style.setProperty("--accent-soft", `${profile.palette[0]}44`);
  view.innerHTML = `
    <div class="session-stage crossfading">
      <button class="icon-button back" data-exit-session aria-label="Exit session">‹</button>
      <div class="session-person">Listening with ${escapeHtml(profile.name)} · <span data-session-timer>0:00</span></div>
      <div class="listener-stack" aria-label="Session listeners">
        <span class="avatar" style="${paletteStyle(profile)}">${escapeHtml(profile.initials)}</span>
        ${companion ? `<span class="avatar" style="${paletteStyle(companion)}">${escapeHtml(companion.initials)}</span>` : ""}
        <span class="avatar" style="background:linear-gradient(145deg,#9BA0FA,#3E45A8)">JR</span>
      </div>
      <div class="session-art"></div>
      <p class="session-title">${escapeHtml(track.name)}</p>
      <p class="session-artist">${escapeHtml(track.artist)}</p>
      <div class="progress session-progress"><span style="width:${track.progressPercent}%"></span></div>
      <div class="session-time"><span>${formatTime(track.durationSeconds * track.progressPercent / 100)}</span><span>-${formatTime(track.durationSeconds * (100 - track.progressPercent) / 100)}</span></div>
      <p class="sync" data-sync-status>● synced within 84 ms</p>
      <p class="pause-notice" data-pause-notice></p>
      <div class="session-controls">
        <button data-host-pause>Simulate host pause</button>
        <button data-track-change>Simulate track change</button>
      </div>
      <div class="pulse-wrap">
        <button class="pulse-button" data-pulse aria-label="Hold to send pulse">
          <span class="pulse-fill" data-pulse-fill></span>
          <span class="pulse-symbol">✦</span>
        </button>
        <p class="pulse-label" data-pulse-label>press and hold for 1.5 seconds</p>
        <p class="session-note" data-session-note></p>
      </div>
    </div>`;
  view.classList.add("open");
  $("[data-exit-session]", view).addEventListener("click", endSession);
  $("[data-host-pause]", view).addEventListener("click", toggleHostPause);
  $("[data-track-change]", view).addEventListener("click", simulateTrackChange);
  const pulseButton = $("[data-pulse]", view);
  pulseButton.addEventListener("pointerdown", startPulseCharge);
  pulseButton.addEventListener("pointerup", releasePulseCharge);
  pulseButton.addEventListener("pointerleave", cancelPulseCharge);
  pulseButton.addEventListener("pointercancel", cancelPulseCharge);
  pulseButton.addEventListener("keydown", (event) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) startPulseCharge(event);
  });
  pulseButton.addEventListener("keyup", (event) => {
    if (event.key === " " || event.key === "Enter") releasePulseCharge(event);
  });
  if (Date.now() < state.pulseCooldownUntil) beginPulseCooldownDisplay();
  clearInterval(state.sessionTimerId);
  state.sessionTimerId = setInterval(() => {
    const timer = $("[data-session-timer]", view);
    if (timer) timer.textContent = formatTime((Date.now() - state.sessionStartedAt) / 1000);
  }, 1000);
}

function endSession() {
  const profile = state.session;
  const elapsed = Math.max(1, Math.round((Date.now() - state.sessionStartedAt) / 60000));
  if (profile?.currentTrack) {
    anchors.unshift({
      id: `a${Date.now()}`,
      username: profile.username,
      track: profile.currentTrack.name,
      artist: profile.currentTrack.artist,
      minutes: elapsed,
      pulses: state.pulsesThisSession,
      date: "Just now",
      mood: null,
      distance: `${distanceMiles(profile).toFixed(1)} miles`,
      health: 100
    });
    renderAnchors();
  }
  clearInterval(state.sessionTimerId);
  state.sessionTimerId = null;
  clearInterval(state.pulseCooldownTimerId);
  state.pulseCooldownTimerId = null;
  $("#session-view").classList.remove("open");
  state.session = null;
  state.sessionPaused = false;
  toast("Session saved as a private Memory Anchor.");
}

function startPulseCharge(event) {
  event.preventDefault();
  if (!state.session || state.sessionPaused || Date.now() < state.pulseCooldownUntil) return;
  state.pulseCharging = true;
  state.pulseReady = false;
  state.pulseStartedAt = Date.now();
  const button = $("[data-pulse]");
  const fill = $("[data-pulse-fill]");
  button.classList.add("charging");
  fill.style.transition = "height 1.5s linear";
  fill.style.height = "100%";
  state.pulseChargeTimer = setTimeout(() => {
    state.pulseReady = true;
    button.classList.add("ready");
    $("[data-pulse-label]").textContent = "release to send";
  }, 1500);
}

function releasePulseCharge(event) {
  event.preventDefault();
  if (!state.pulseCharging) return;
  const heldLongEnough = state.pulseReady || Date.now() - state.pulseStartedAt >= 1500;
  clearTimeout(state.pulseChargeTimer);
  state.pulseCharging = false;
  if (heldLongEnough) firePulse();
  else {
    resetPulseCharge();
    $("[data-session-note]").textContent = "Keep holding — the Pulse should feel intentional.";
    setTimeout(() => {
      const note = $("[data-session-note]");
      if (note) note.textContent = "";
    }, 1800);
  }
}

function cancelPulseCharge() {
  if (!state.pulseCharging) return;
  clearTimeout(state.pulseChargeTimer);
  state.pulseCharging = false;
  resetPulseCharge();
}

function resetPulseCharge() {
  const button = $("[data-pulse]");
  const fill = $("[data-pulse-fill]");
  if (!button || !fill) return;
  button.classList.remove("charging", "ready");
  fill.style.transition = "height .25s ease";
  fill.style.height = "0";
  const label = $("[data-pulse-label]");
  if (label) label.textContent = "press and hold for 1.5 seconds";
}

function firePulse() {
  const button = $("[data-pulse]");
  resetPulseCharge();
  button.classList.remove("pulsing");
  void button.offsetWidth;
  button.classList.add("pulsing");
  const stage = $(".session-stage");
  const spark = document.createElement("div");
  spark.className = "pulse-spark";
  stage.appendChild(spark);
  spark.addEventListener("animationend", () => spark.remove());
  $("[data-session-note]").textContent = `Pulse sent to ${state.session.name} ✦`;
  state.pulsesThisSession += 1;
  state.pulseCooldownUntil = Date.now() + PULSE_COOLDOWN_MS;
  beginPulseCooldownDisplay();
}

// Pulses are rationed so each one stays meaningful. The demo shortens the
// production 5-minute cooldown to 45 seconds so visitors can feel the cycle.
const PULSE_COOLDOWN_MS = 45000;

function beginPulseCooldownDisplay() {
  const button = $("[data-pulse]");
  const label = $("[data-pulse-label]");
  if (!button || !label) return;
  button.disabled = true;
  button.classList.add("cooling");
  clearInterval(state.pulseCooldownTimerId);
  const tick = () => {
    const remaining = state.pulseCooldownUntil - Date.now();
    const currentButton = $("[data-pulse]");
    const currentLabel = $("[data-pulse-label]");
    if (!currentButton || !currentLabel) { clearInterval(state.pulseCooldownTimerId); return; }
    if (remaining <= 0) {
      clearInterval(state.pulseCooldownTimerId);
      state.pulseCooldownTimerId = null;
      currentButton.disabled = false;
      currentButton.classList.remove("cooling");
      currentLabel.textContent = "press and hold for 1.5 seconds";
      return;
    }
    currentLabel.textContent = `cooldown ${formatTime(remaining / 1000)} · demo-shortened from 5:00`;
  };
  tick();
  state.pulseCooldownTimerId = setInterval(tick, 1000);
}

function toggleHostPause(event) {
  state.sessionPaused = !state.sessionPaused;
  const stage = $(".session-stage");
  stage.classList.toggle("paused", state.sessionPaused);
  $("[data-pause-notice]").textContent = state.sessionPaused ? `${state.session.name} paused` : "";
  $("[data-sync-status]").textContent = state.sessionPaused ? "Ⅱ host paused · playback stopped" : "● re-synced within 71 ms";
  event.currentTarget.textContent = state.sessionPaused ? "Simulate host resume" : "Simulate host pause";
}

function simulateTrackChange(event) {
  if (!state.session?.currentTrack) return;
  const button = event.currentTarget;
  const stage = $(".session-stage");
  stage.classList.remove("crossfading");
  void stage.offsetWidth;
  stage.classList.add("crossfading");
  const titles = ["Soft Static", "River Lights", "Golden Noise"];
  $(".session-title").textContent = titles[Math.floor(Date.now() / 1000) % titles.length];
  button.textContent = "Crossfaded to next track";
  setTimeout(() => {
    if (button.isConnected) button.textContent = "Simulate track change";
  }, 1800);
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function switchView(viewName, bypassOnboarding = false) {
  if (viewName === "discover" && !state.wavelengthReady && !bypassOnboarding) {
    openWavelengthOnboarding();
    return;
  }
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
}

function switchDiscoverMode(mode) {
  state.discoverMode = mode;
  $$(".mode-button").forEach((button) => button.classList.toggle("active", button.dataset.discoverMode === mode));
  $("#radar-panel").classList.toggle("active", mode === "radar");
  $("#swipe-panel").classList.toggle("active", mode === "swipe");
  $("#list-panel").classList.toggle("active", mode === "list");
  if (mode === "radar") renderRadar();
  if (mode === "swipe") renderSwipeDeck();
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => element.classList.remove("show"), 2400);
}

async function init() {
  try {
    const response = await fetch("data/profiles.json");
    if (!response.ok) throw new Error(`Profile data request failed: ${response.status}`);
    const data = await response.json();
    state.profiles = data.profiles;
    const demoGenders = ["Woman","Man","Nonbinary","Woman","Man"];
    const demoOrientations = ["Straight","Bisexual","Gay","Queer / open","Straight"];
    state.profiles.forEach((profile,index) => {
      profile.demoGender = demoGenders[index % demoGenders.length];
      profile.demoOrientation = demoOrientations[index % demoOrientations.length];
    });
    state.following = new Set(state.profiles.slice(0, 18).map((profile) => profile.username));
    rebuildWavelengthQueue();
    buildConversations();
    $("#network-count").textContent = state.profiles.length;
    $("#live-count").textContent = `${state.profiles.filter((profile) => ["listening", "in-session"].includes(profile.status)).length} live now`;
    renderProfiles();
    renderRadar();
    renderActivity();
    renderHome();
    renderReviews();
    renderAnchors();
    renderCapsules();
    renderSwipeDeck();
    renderConversations();
  } catch (error) {
    console.error(error);
    const message = `<div class="load-error"><strong>The Philadelphia network is unreachable.</strong>Profile data failed to load. Refresh to try again — the demo needs data/profiles.json to be served alongside it.</div>`;
    $("#live-session-rail").innerHTML = message;
    $("#home-match-list").innerHTML = "";
    $("#profile-list").innerHTML = message;
  }
}

$("#profile-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProfiles();
});
$$(".filter").forEach((button) => button.addEventListener("click", () => {
  state.filter = button.dataset.filter;
  $$(".filter").forEach((item) => item.classList.toggle("active", item === button));
  renderProfiles();
}));
$$(".mode-button").forEach((button) => button.addEventListener("click", () => {
  switchDiscoverMode(button.dataset.discoverMode);
}));
$$("[data-radius]").forEach((button) => button.addEventListener("click", () => {
  state.radiusMiles = Number(button.dataset.radius);
  $$("[data-radius]").forEach((item) => item.classList.toggle("active", item === button));
  renderRadar();
}));
$$("[data-swipe-action]").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.swipeAction === "profile") {
    const profile = state.swipeQueue[state.swipeIndex];
    if (profile) openProfile(profile.username);
  } else actOnSwipe(button.dataset.swipeAction);
}));
$("#message-search").addEventListener("input", event => renderConversations(event.target.value));
$("[data-compose]").addEventListener("click", () => toast("Choose any person in Discover to start a private conversation."));
$$(".memory-tab").forEach((button) => button.addEventListener("click", () => {
  $$(".memory-tab").forEach((item) => item.classList.toggle("active", item === button));
  $$("[data-memory-panel]").forEach((panel) =>
    panel.classList.toggle("active", panel.dataset.memoryPanel === button.dataset.memoryTab)
  );
}));
$$("[data-user-privacy]").forEach((button) => button.addEventListener("click", () => {
  state.userPrivacy = button.dataset.userPrivacy;
  $$("[data-user-privacy]").forEach((item) => item.classList.toggle("active", item === button));
  const descriptions = {
    "open-door": "Friends can join without waiting. You’ll always see who arrived.",
    "knock-first": "Friends request access before their playback syncs to yours.",
    ghost: "You can listen and join others, but your own live status disappears."
  };
  $("#privacy-description").textContent = descriptions[state.userPrivacy];
  $("#current-privacy-value").textContent = titleCase(state.userPrivacy);
  toast(`John is now in ${titleCase(state.userPrivacy)} mode.`);
}));
$("[data-open-spark]").addEventListener("click", openSparkDemo);
$("[data-service-picker]").addEventListener("click", chooseMusicService);
$("[data-start-own-session]").addEventListener("click", chooseOwnTrack);
$("[data-see-all-live]").addEventListener("click", () => { state.wavelengthReady = true; switchView("discover", true); switchDiscoverMode("list"); });
$("[data-open-wavelength]").addEventListener("click", () => switchView("discover"));
$("#feature-modal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeFeatureModal();
});
$$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
$$(".self-avatar").forEach((button) => button.addEventListener("click", () => switchView("you")));

init();
