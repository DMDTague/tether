const state = {
  profiles: [],
  filter: "all",
  search: "",
  following: new Set(),
  selected: null,
  session: null,
  toastTimer: null
};

const DYLAN_VIBE = [0.64, 0.72, 0.68, 0.31];
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
  const dot = vector.reduce((sum, value, index) => sum + value * DYLAN_VIBE[index], 0);
  const a = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
  const b = Math.sqrt(DYLAN_VIBE.reduce((sum, value) => sum + value ** 2, 0));
  return Math.round((dot / (a * b)) * 100);
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
          <div><strong>${profile.metrics.pulsesSent}</strong><span>pulses sent</span></div>
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
  $("[data-more]", view).addEventListener("click", () => toast("Mute, sever, and transparent presence controls would open here."));
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
    toast(`A musical moment was left for ${profile.name}.`);
    return;
  }
  if (profile.privacyMode === "knock-first") {
    const button = $("[data-session]", $("#profile-view"));
    button.disabled = true;
    button.textContent = "Knocking…";
    toast(`Knock sent to ${profile.name}`);
    setTimeout(() => startSession(profile), 900);
  } else {
    startSession(profile);
  }
}

function startSession(profile) {
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

function endSession() {
  $("#session-view").classList.remove("open");
  state.session = null;
  toast("Session saved as a new memory anchor.");
}

function sendPulse(event) {
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

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function switchView(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
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
    renderActivity();
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
$$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
$$(".self-avatar").forEach((button) => button.addEventListener("click", () => switchView("you")));

init();
