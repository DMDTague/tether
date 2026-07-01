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
  sessionStartedAt: 0,
  sessionTimerId: null,
  toastTimer: null
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
  const latitudeMiles = (profile.location.latitude - CURRENT_USER.latitude) * 69;
  const longitudeMiles = (profile.location.longitude - CURRENT_USER.longitude) *
    69 * Math.cos(CURRENT_USER.latitude * Math.PI / 180);
  return {
    x: Math.max(5, Math.min(95, 50 + (longitudeMiles / state.radiusMiles) * 43)),
    y: Math.max(5, Math.min(95, 50 - (latitudeMiles / state.radiusMiles) * 43))
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
  state.selectedPing = username;
  renderRadar();
  renderRadarPreview(state.profiles.find((profile) => profile.username === username));
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
  const [accent = "#a59af4", secondary = "#24222e"] = profile.palette;
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
  modal.innerHTML = `<div class="modal-sheet">${content}</div>`;
  modal.classList.add("open");
  $$("[data-close-modal]", modal).forEach((button) => button.addEventListener("click", closeFeatureModal));
}

function closeFeatureModal() {
  const modal = $("#feature-modal");
  modal.classList.remove("open");
  modal.innerHTML = "";
}

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

function legacyStartSession(profile) {
  state.session = profile;
  closeProfile();
  const view = $("#session-view");
  const track = profile.currentTrack;
  view.style.setProperty("--accent", profile.palette[0]);
  view.style.setProperty("--accent-soft", `${profile.palette[0]}44`);
  view.innerHTML = `
    <div class="session-stage">
      <button class="icon-button back" data-exit-session aria-label="Exit session">‹</button>
      <div class="session-person">tethered with ${escapeHtml(profile.name)} · ${escapeHtml(profile.location.neighborhood)}</div>
      <div class="session-art"></div>
      <p class="session-title">${escapeHtml(track.name)}</p>
      <p class="session-artist">${escapeHtml(track.artist)}</p>
      <div class="progress session-progress"><span style="width:${track.progressPercent}%"></span></div>
      <div class="session-time"><span>${formatTime(track.durationSeconds * track.progressPercent / 100)}</span><span>-${formatTime(track.durationSeconds * (100 - track.progressPercent) / 100)}</span></div>
      <p class="sync">● synced within 84 ms</p>
      <div class="pulse-wrap">
        <button class="pulse-button" data-pulse aria-label="Send pulse">✦</button>
        <p class="pulse-label">tap to send a pulse</p>
        <p class="session-note" data-session-note></p>
      </div>
    </div>`;
  view.classList.add("open");
  $("[data-exit-session]", view).addEventListener("click", endSession);
  $("[data-pulse]", view).addEventListener("click", sendPulse);
}

function legacyEndSession() {
  $("#session-view").classList.remove("open");
  state.session = null;
  toast("Session saved as a new memory anchor.");
}

function legacySendPulse(event) {
  const button = event.currentTarget;
  button.classList.remove("pulsing");
  void button.offsetWidth;
  button.classList.add("pulsing");
  $("[data-session-note]").textContent = `Pulse sent to ${state.session.name} ✦`;
  button.disabled = true;
  setTimeout(() => {
    button.disabled = false;
    $("[data-session-note]").textContent = "";
  }, 1800);
}

// Enhanced session implementation. These declarations intentionally supersede
// the compact prototype handlers above while preserving the same call sites.
function startSession(profile) {
  state.session = profile;
  state.sessionPaused = false;
  state.sessionStartedAt = Date.now();
  state.pulseReady = false;
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
        <span class="avatar" style="background:linear-gradient(145deg,#a59af4,#3b3456)">JR</span>
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
      pulses: state.pulseCooldownUntil > Date.now() ? 1 : 0,
      date: "Just now",
      mood: null,
      distance: `${distanceMiles(profile).toFixed(1)} miles`,
      health: 100
    });
    renderAnchors();
  }
  clearInterval(state.sessionTimerId);
  state.sessionTimerId = null;
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
  $("[data-pulse-label]").textContent = "5 minute cooldown";
  state.pulseCooldownUntil = Date.now() + 300000;
  button.disabled = true;
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

function switchView(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
}

function switchDiscoverMode(mode) {
  state.discoverMode = mode;
  $$(".mode-button").forEach((button) => button.classList.toggle("active", button.dataset.discoverMode === mode));
  $("#radar-panel").classList.toggle("active", mode === "radar");
  $("#list-panel").classList.toggle("active", mode === "list");
  if (mode === "radar") renderRadar();
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
    state.following = new Set(state.profiles.slice(0, 18).map((profile) => profile.username));
    $("#network-count").textContent = state.profiles.length;
    $("#live-count").textContent = `${state.profiles.filter((profile) => ["listening", "in-session"].includes(profile.status)).length} live now`;
    renderProfiles();
    renderRadar();
    renderActivity();
    renderAnchors();
    renderCapsules();
  } catch (error) {
    console.error(error);
    $("#profile-list").innerHTML = `<p class="empty">The Philadelphia profile data could not be loaded.</p>`;
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
$("#feature-modal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeFeatureModal();
});
$$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
$$(".self-avatar").forEach((button) => button.addEventListener("click", () => switchView("you")));

init();
