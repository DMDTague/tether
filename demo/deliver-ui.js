(() => {
  "use strict";

  const one = (selector, root = document) => root.querySelector(selector);
  const many = (selector, root = document) => [...root.querySelectorAll(selector)];
  const saveJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  };
  const loadJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch (_) { return fallback; }
  };
  const tell = message => {
    if (typeof toast === "function") toast(message);
    else {
      const host = one("#toast");
      if (host) { host.textContent = message; host.classList.add("show"); }
    }
  };

  const DEMO_DECISIONS_KEY = "tether.deliver.dating-decisions.v1";
  const DATING_READY_KEY = "tether.deliver.dating-ready.v1";
  const SAVED_PROFILES_KEY = "tether.deliver.saved-profiles.v1";
  const decisions = loadJson(DEMO_DECISIONS_KEY, []);
  const savedProfiles = new Set(loadJson(SAVED_PROFILES_KEY, []));
  let lastPass = null;
  let datingStep = 0;

  const onboardingSteps = ["Identity & age", "Photos", "Intent & music", "Visibility & safety"];

  const recommendationData = [
    {
      title: "Myth",
      artist: "Beach House",
      album: "Bloom",
      explanation: "People who share your enduring love of Japanese Breakfast, Bon Iver, and Radiohead repeatedly return to this track.",
      provenance: ["Socially inferred", "No listen found", "78% confidence"],
    },
    {
      title: "A House in Nebraska",
      artist: "Ethel Cain",
      album: "Preacher's Daughter",
      explanation: "Long-form listeners in your musical neighborhood finish this track and save it after late-night sessions.",
      provenance: ["Behavioral evidence", "New to Tether history", "Exploration pick"],
    },
  ];

  const exchangeFeeds = {
    local: [
      ["Philly indie shows", "The room changed when the bridge landed", "A listening note from a small South Philly venue, grouped at the city level rather than pinned to a coordinate.", "23 meaningful replies"],
      ["Queer metalheads", "Five releases moving through the local scene", "A community list built from saves, full listens, and show attendance—not raw popularity.", "12 people opened a track"],
    ],
    rising: [
      ["Under-exposed creator", "The album sequencing argument worth having", "A new review gaining useful replies and listen conversions without being crowded out by incumbent accounts.", "Rising · 41m"],
      ["Night listeners", "Three records for the last train home", "Fresh momentum, creator exposure caps, and deliberate exploration place this list here.", "Rising · 1h"],
    ],
    new: [
      ["New post", "What are you hearing all the way through?", "Strict chronological order. No personalization, no hidden reshuffling.", "Now"],
      ["New review", "A quiet 4.5 for an album that rewards patience", "Music rating and review usefulness remain separate judgments.", "3m"],
    ],
  };

  const communities = [
    ["Philly indie shows", "Local-scene regular · 1.8K members", "Public"],
    ["Queer metalheads", "Music + identity · 640 members", "Dating & Exchange"],
    ["Album-order loyalists", "Listening ritual · 4.2K members", "Public"],
    ["Jiu-jitsu", "Lifestyle sticker · 920 members", "Friends only"],
    ["Night listeners", "Listening rhythm · 3.1K members", "Public"],
    ["New in town", "Connection intent · 760 members", "Wavelength"],
  ];

  const localScenes = [
    ["Philadelphia indie", "Activity from venues, lists, and communities across the city", "184 listeners active"],
    ["Late-night R&B", "Grouped city activity with no nearest-first ordering", "96 listeners active"],
    ["Punk and hardcore", "Rising reviews, shows, and community threads", "71 listeners active"],
    ["Electronic nights", "Sets, lists, and people available for shared listening", "63 listeners active"],
  ];

  function currentSwipeProfile() {
    if (typeof state === "undefined") return null;
    return state.swipeQueue?.[state.swipeIndex] || null;
  }

  function broadBandForRadius(radius) {
    if (Number(radius) <= 5) return "Nearby";
    if (Number(radius) <= 10) return "In your city";
    return "Within the region";
  }

  function coarsenProfileLocations() {
    if (typeof CURRENT_USER !== "undefined") CURRENT_USER.neighborhood = "Philadelphia";
    if (typeof state === "undefined" || !Array.isArray(state.profiles)) return;
    state.profiles.forEach(profile => {
      if (profile.location) profile.location.neighborhood = "Philadelphia";
    });
  }

  function sanitizeDistanceLanguage(root = document) {
    const replacements = [
      [/within\s+\d+(?:\.\d+)?\s*miles?/gi, "within the region"],
      [/\b\d+(?:\.\d+)?\s*miles?\b/gi, "broad proximity"],
      [/\b\d+\s*[–-]\s*\d+\s*mi\b/gi, "city"],
      [/\b\d+\+?\s*mi\b/gi, "region"],
      [/<\s*\d+\s*mi/gi, "nearby"],
    ];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let next = node.nodeValue;
      replacements.forEach(([pattern, replacement]) => { next = next.replace(pattern, replacement); });
      if (next !== node.nodeValue) node.nodeValue = next;
    });
    const radiusLabel = one("#radar-radius-label");
    if (radiusLabel && typeof state !== "undefined") radiusLabel.textContent = broadBandForRadius(state.radiusMiles);
  }

  function renderKnocks() {
    const host = one("#knock-invite-list");
    if (!host) return;
    host.innerHTML = [
      { initials: "ZK", name: "Zuri", detail: "Knocked while you were playing Night Transit", track: "Neon Weather · Burna Boy", action: "Let in", type: "knock" },
      { initials: "RH", name: "Hiroshi", detail: "Invited you into an open listen", track: "Imaginal Disk · Magdalena Bay", action: "Join", type: "invite" },
    ].map((item, index) => `<article class="knock-card" data-live-request="${index}">
      <span class="knock-avatar">${item.initials}</span>
      <span class="knock-copy"><strong>${item.name}</strong><small>${item.detail}</small><em>${item.track}</em></span>
      <span class="knock-actions"><button data-request-decline="${index}">Later</button><button class="accept" data-request-accept="${index}" data-request-type="${item.type}">${item.action}</button></span>
    </article>`).join("");
  }

  function renderRecommendations() {
    const host = one("#recommendation-rail");
    if (!host || typeof coverArt !== "function") return;
    host.innerHTML = recommendationData.map((item, index) => `<article class="recommendation-card">
      <span class="recommendation-art">${coverArt(item.title, item.artist)}</span>
      <div class="recommendation-copy"><p class="eyebrow">${item.album}</p><h3>${item.title}</h3><small>${item.artist}</small><p>${item.explanation}</p><div class="provenance-row">${item.provenance.map(label => `<span>${label}</span>`).join("")}</div></div>
      <div class="recommendation-actions"><button data-rec-action="play" data-rec-index="${index}">Play</button><button data-rec-action="save" data-rec-index="${index}">Save</button><button data-rec-action="tether" data-rec-index="${index}">Tether</button><button data-rec-action="known" data-rec-index="${index}">I know this</button><button data-rec-action="why" data-rec-index="${index}">Why this?</button><button data-rec-action="send" data-rec-index="${index}">Send</button></div>
    </article>`).join("");
  }

  function renderResurfacedMemory() {
    const host = one("#resurfaced-memory-card");
    if (!host) return;
    host.innerHTML = `<article class="resurfaced-card"><p class="eyebrow">Observed shared history</p><h3>“Neon Weather” with Zuri</h3><p>Last Wednesday · 48 synchronized minutes · 3 Pulses · feeling: nostalgic</p><small>No invented mileage. Only the person, track, time, duration, and gesture Tether actually recorded.</small><div class="resurfaced-card-actions"><button data-memory-retether>Listen together again</button><button data-memory-open>Open Anchor</button></div></article>`;
  }

  function exchangeCard([source, title, body, meta]) {
    return `<article class="exchange-object-card"><div class="exchange-object-head"><strong>${source}</strong><span>${meta}</span></div><h3>${title}</h3><p>${body}</p><div class="exchange-object-meta"><span>Verified listen context</span><span>Explainable ranking</span></div><div class="exchange-action-bar"><button data-exchange-action="listen">Listen</button><button data-exchange-action="useful">Useful</button><button data-exchange-action="reply">Reply</button><button data-exchange-action="tether">Tether</button></div></article>`;
  }

  function renderSupplementalExchange() {
    Object.entries(exchangeFeeds).forEach(([key, items]) => {
      const host = one(`#${key}-feed`);
      if (host) host.innerHTML = items.map(exchangeCard).join("");
    });
    enhanceReviewActions();
  }

  function enhanceReviewActions() {
    many("#review-feed article, #following-feed article").forEach(card => {
      if (one(".exchange-action-bar", card)) return;
      const bar = document.createElement("div");
      bar.className = "exchange-action-bar";
      bar.innerHTML = `<button data-exchange-action="listen">Listen</button><button data-exchange-action="useful">Useful</button><button data-exchange-action="reply">Reply</button><button data-exchange-action="tether">Tether</button>`;
      card.append(bar);
    });
  }

  function renderCommunities() {
    const host = one("#community-card-grid");
    if (host) host.innerHTML = communities.map(([name, detail, visibility], index) => `<button class="community-card" data-community-index="${index}"><b>${name}</b><small>${detail}</small><span>${visibility}</span></button>`).join("");
    const localHost = one("#local-scene-grid");
    if (localHost) localHost.innerHTML = localScenes.map(([name, detail, activity], index) => `<button class="local-scene-card" data-local-scene="${index}"><b>${name}</b><small>${detail}</small><span>${activity}</span></button>`).join("");
  }

  function updateDatingReadiness(ready) {
    const card = one(".dating-readiness-card");
    if (!card) return;
    const ring = one(".readiness-ring", card);
    if (ring) { ring.textContent = ready ? "100%" : "62%"; ring.style.setProperty("--progress", ready ? "100" : "62"); }
    if (ready) {
      many(".dating-checklist li", card).forEach(item => item.classList.add("done"));
      const title = one("h3", card);
      const copy = one("h3 + p", card);
      if (title) title.textContent = "Your Dating profile is ready";
      if (copy) copy.textContent = "You control when it becomes discoverable. Mutual interest is required before messaging.";
      const primary = one("[data-start-dating-onboarding]", card);
      if (primary) primary.textContent = "Review setup";
    }
  }

  function switchWavelengthPanel(name) {
    many("[data-wavelength-hub]").forEach(button => button.classList.toggle("active", button.dataset.wavelengthHub === name));
    many("[data-wavelength-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.wavelengthPanel === name));
  }

  function datingProgressMarkup() {
    return `<div class="dating-onboarding-progress" aria-label="Step ${datingStep + 1} of ${onboardingSteps.length}">${onboardingSteps.map((_, index) => `<i class="${index <= datingStep ? "active" : ""}"></i>`).join("")}</div>`;
  }

  function datingStepMarkup(step) {
    if (step === 0) return `<div class="dating-form-grid two">
      <label>First name<input value="John" data-dating-field="first"></label>
      <label>Date of birth<input type="date" value="2004-07-07" data-dating-field="dob"></label>
      <label>Gender identity<select><option>Man</option><option>Woman</option><option>Nonbinary</option><option>Custom</option></select></label>
      <label>Show me<select><option>Men</option><option>Women</option><option>Nonbinary people</option><option>Multiple categories</option></select></label>
    </div><p class="modal-copy">Identity and discovery eligibility are separate. Tether confirms 18+ status before discoverability.</p>`;
    if (step === 1) return `<p class="modal-copy">At least two public photos are required. Private albums remain individually shareable and revocable.</p><div class="photo-demo-grid"><div class="photo-demo">Primary photo<br>ready</div><div class="photo-demo">Second photo<br>ready</div><button class="photo-demo" data-add-demo-photo>+ Add media</button></div>`;
    if (step === 2) return `<div class="dating-form-grid">
      <label>Relationship or meeting intent<select><option>Long-term relationship</option><option>Dating</option><option>Friendship first</option><option>Still exploring</option></select></label>
      <label>Profile prompt<textarea rows="3">The fastest way to understand me is to hear the album I never shuffle.</textarea></label>
      <label>Music identity connection<select><option>Use my public music identity</option><option>Choose a Dating-specific anthem</option></select></label>
      <label>Anthem<select><option>Grace · Jeff Buckley</option><option>Let Down · Radiohead</option><option>Jubilee · Japanese Breakfast</option></select></label>
    </div>`;
    return `<div class="dating-form-grid">
      <label>Location choice<select><option>Philadelphia · city only</option><option>Use short-lived approximate location</option></select></label>
      <div class="visibility-row"><span>Height</span><select><option>Show publicly</option><option selected>After matching</option><option>Filter only</option><option>Do not use</option></select></div>
      <div class="visibility-row"><span>Relationship structure</span><select><option selected>Show publicly</option><option>After matching</option><option>Filter only</option><option>Do not use</option></select></div>
      <div class="visibility-row"><span>Position</span><select><option>Show publicly</option><option>After matching</option><option selected>Filter only</option><option>Do not use</option></select></div>
      <label class="safety-check"><input type="checkbox" checked data-safety-ack><span>I understand Dating visibility, broad location bands, blocking, reporting, private albums, and mutual matching.</span></label>
    </div>`;
  }

  function openDatingOnboarding(startStep = 0) {
    datingStep = Math.max(0, Math.min(onboardingSteps.length - 1, startStep));
    if (typeof openFeatureModal !== "function") return;
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Dating setup · ${onboardingSteps[datingStep]}</p><h3>Build an informed, private profile</h3></div><button class="icon-button" data-close-deliver-modal aria-label="Close">×</button></div>${datingProgressMarkup()}${datingStepMarkup(datingStep)}<div class="onboarding-actions">${datingStep ? `<button class="btn" data-dating-back>Back</button>` : ""}<button class="btn primary" data-dating-next>${datingStep === onboardingSteps.length - 1 ? "Finish setup" : "Continue"}</button></div>`);
    const modal = one("#feature-modal");
    one("[data-close-deliver-modal]", modal)?.addEventListener("click", closeFeatureModal);
    one("[data-dating-back]", modal)?.addEventListener("click", () => openDatingOnboarding(datingStep - 1));
    one("[data-dating-next]", modal)?.addEventListener("click", () => {
      if (datingStep < onboardingSteps.length - 1) { openDatingOnboarding(datingStep + 1); return; }
      if (!one("[data-safety-ack]", modal)?.checked) { tell("Accept the safety and visibility controls to continue."); return; }
      try { localStorage.setItem(DATING_READY_KEY, "true"); } catch (_) {}
      enableDatingWorld();
      updateDatingReadiness(true);
      closeFeatureModal();
      if (typeof switchView === "function") switchView("discover");
      tell("Dating profile ready. You are shown only to reciprocally eligible people.");
    });
    one("[data-add-demo-photo]", modal)?.addEventListener("click", () => tell("Media picker opened in the native product."));
  }

  function enableDatingWorld() {
    if (typeof state === "undefined") return;
    state.datingMode = true;
    state.datingIntent = "Long-term relationship";
    state.wavelengthProfile.goal = "dating";
    if (typeof syncDatingModeControls === "function") syncDatingModeControls();
    if (typeof rebuildWavelengthQueue === "function") rebuildWavelengthQueue();
    if (typeof renderSwipeDeck === "function") renderSwipeDeck();
    if (typeof renderConversations === "function") renderConversations(one("#message-search")?.value || "");
    many("[data-dating-mode-toggle] small").forEach(label => { label.textContent = "On"; });
  }

  function previewDatingProfile() {
    if (typeof openFeatureModal !== "function") return;
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Dating card preview</p><h3>John, 22 · Long-term</h3></div><button class="icon-button" data-close-deliver-modal>×</button></div><div class="photo-demo-grid"><div class="photo-demo">Primary photo</div><div class="photo-demo">Second photo</div><div class="photo-demo">Private album</div></div><div class="profile-depth-chips" style="margin-top:12px"><span>Night listener</span><span>Album-order loyalist</span><span>Martial arts</span></div><p class="modal-copy"><strong>Why shown:</strong> reciprocal intent, shared Radiohead and Japanese Breakfast history, two shared communities, and compatible city-level discovery.</p><div class="profile-depth-actions"><button>Pass</button><button>Save</button><button>Open full profile</button><button class="primary">Send song</button></div>`);
    one("[data-close-deliver-modal]", one("#feature-modal"))?.addEventListener("click", closeFeatureModal);
  }

  function openWavelengthFilters() {
    if (typeof openFeatureModal !== "function") return;
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Free discovery controls</p><h3>Who should be eligible?</h3></div><button class="icon-button" data-close-deliver-modal>×</button></div><p class="modal-copy">Every setting below affects eligibility. None is paywalled.</p><div class="dating-form-grid two"><label>Age<select><option>21–30</option></select></label><label>Intent<select><option>Long-term</option></select></label><label>Proximity<select><option>In my city</option><option>Nearby</option><option>Within the region</option></select></label><label>Communities<select><option>Any</option><option>Shared communities</option></select></label><label>Music<select><option>Use taste evidence</option></select></label><label>Relationship structure<select><option>Compatible only</option></select></label></div><div class="onboarding-actions"><button class="btn" data-close-deliver-modal-2>Cancel</button><button class="btn primary" data-save-deliver-filters>Apply filters</button></div>`);
    const modal = one("#feature-modal");
    many("[data-close-deliver-modal],[data-close-deliver-modal-2]", modal).forEach(button => button.addEventListener("click", closeFeatureModal));
    one("[data-save-deliver-filters]", modal)?.addEventListener("click", () => { closeFeatureModal(); tell("Eligibility filters applied reciprocally."); });
  }

  function recordDecision(type, profile, extra = {}) {
    if (!profile) return;
    decisions.unshift({ type, username: profile.username, at: new Date().toISOString(), ...extra });
    decisions.splice(50);
    saveJson(DEMO_DECISIONS_KEY, decisions);
  }

  function advanceSwipe() {
    if (typeof state === "undefined") return;
    state.swipeIndex = Math.min(state.swipeIndex + 1, Math.max(0, state.swipeQueue.length - 1));
    if (typeof renderSwipeDeck === "function") renderSwipeDeck();
  }

  function showDecisionStatus(message) {
    const host = one("#swipe-decision-status");
    if (!host) return;
    host.hidden = false;
    host.textContent = message;
  }

  function handlePass() {
    const profile = currentSwipeProfile();
    if (!profile) return;
    lastPass = { index: state.swipeIndex, username: profile.username };
    recordDecision("passed", profile, { reason: "private_unspecified" });
    showDecisionStatus(`${profile.name} was passed privately. Undo is available for ten seconds.`);
    advanceSwipe();
    setTimeout(() => { if (lastPass?.username === profile.username) lastPass = null; }, 10000);
  }

  function handleSignal() {
    const profile = currentSwipeProfile();
    if (!profile) return;
    recordDecision("signal_sent", profile, { object: "Grace · Jeff Buckley" });
    showDecisionStatus(`Signal sent to ${profile.name}. Messaging opens only if interest becomes mutual.`);
    advanceSwipe();
  }

  function handleSaveProfile() {
    const profile = currentSwipeProfile();
    if (!profile) return;
    savedProfiles.add(profile.username);
    saveJson(SAVED_PROFILES_KEY, [...savedProfiles]);
    recordDecision("saved", profile);
    showDecisionStatus(`${profile.name} is saved privately for later.`);
    tell("Profile saved. No like or notification was sent.");
  }

  function handleUndoPass() {
    if (!lastPass || typeof state === "undefined") { tell("There is no recent pass to undo."); return; }
    state.swipeIndex = lastPass.index;
    const username = lastPass.username;
    lastPass = null;
    recordDecision("pass_undone", { username, name: username });
    if (typeof renderSwipeDeck === "function") renderSwipeDeck();
    showDecisionStatus("Pass undone. The profile is back in your deck.");
  }

  function explainCurrentPerson() {
    const profile = currentSwipeProfile();
    if (!profile || typeof openFeatureModal !== "function") return;
    const shared = typeof sharedArtistsWith === "function" ? sharedArtistsWith(profile) : [];
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Why this person?</p><h3>${profile.name}</h3></div><button class="icon-button" data-close-deliver-modal>×</button></div><div class="profile-depth-section"><p><strong>Observed:</strong> ${shared.length || 1} shared artist signal${shared.length === 1 ? "" : "s"} and recent listening activity.</p><p><strong>Self-declared:</strong> compatible connection intent and public community stickers.</p><p><strong>Imported:</strong> connected music-account artists, not private messages or raw searches.</p><p><strong>Location:</strong> eligible in the same broad city band. Their position in the deck does not reveal distance.</p></div>`);
    one("[data-close-deliver-modal]", one("#feature-modal"))?.addEventListener("click", closeFeatureModal);
  }

  function enhanceSwipeCard() {
    const card = one("#swipe-deck > *:first-child");
    const profile = currentSwipeProfile();
    if (!card || !profile || one(".deliver-card-evidence", card)) return;
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    const shared = typeof sharedArtistsWith === "function" ? sharedArtistsWith(profile) : [];
    const evidence = document.createElement("div");
    evidence.className = "deliver-card-evidence";
    evidence.innerHTML = `<strong>Why Tether is showing ${profile.first || profile.name.split(" ")[0]}</strong><p>${shared.length ? `${shared.slice(0,2).join(" and ")} overlap` : `${profile.topArtists?.[0] || "Musical"} evidence`} · compatible intent · Philadelphia city band</p>`;
    card.append(evidence);
  }

  function enhanceProfile(username) {
    const host = one("#profile-view");
    const profile = typeof profileByUsername === "function" ? profileByUsername(username) : null;
    if (!host || !profile || one(".deliver-profile-depth", host)) return;
    const shared = typeof sharedArtistsWith === "function" ? sharedArtistsWith(profile) : [];
    const depth = document.createElement("div");
    depth.className = "deliver-profile-depth";
    depth.innerHTML = `<section class="profile-depth-section"><p class="eyebrow">Musical interior</p><h3>How ${profile.first || profile.name.split(" ")[0]} moves through music</h3><div class="profile-depth-chips">${(profile.topArtists || []).slice(0,5).map(artist => `<span>${artist}</span>`).join("")}<span>Late-night listener</span><span>Full-album habit</span></div><p>Recent public diary: finished two albums this week and saved three tracks after shared listens.</p></section>
      <section class="profile-depth-section"><p class="eyebrow">Cultural contribution</p><h3>Reviews, lists, and communities</h3><p>Pinned review: “The restraint is what makes the release hit.”</p><div class="profile-depth-chips"><span>Philly indie shows</span><span>Night listeners</span><span>Album-order loyalists</span></div></section>
      <section class="profile-depth-section"><p class="eyebrow">Relational context</p><h3>Why this person is relevant</h3><p>${shared.length ? `You share ${shared.join(", ")}.` : `Their ${profile.topArtists?.[0] || "music"} history is adjacent to yours.`} You have one mutual person and belong to the same city-level scene. This explanation combines observed, imported, and self-declared evidence.</p></section>
      <section class="profile-depth-section"><p class="eyebrow">Actions</p><div class="profile-depth-actions"><button data-depth-action="song">Send song</button><button data-depth-action="message">Message</button><button class="primary" data-depth-action="tether">${profile.privacyMode === "knock-first" ? "Knock" : "Tether"}</button><button data-depth-action="safety">Block or report</button></div></section>`;
    host.append(depth);
    many("[data-depth-action]", depth).forEach(button => button.addEventListener("click", () => {
      const action = button.dataset.depthAction;
      if (action === "tether" && typeof handlePrimaryAction === "function") handlePrimaryAction(profile);
      else if (action === "message" && typeof ensureConversation === "function" && typeof openConversation === "function") { ensureConversation(profile); openConversation(profile.username); }
      else if (action === "safety") openSafetyMenu(profile);
      else openSongGesture(profile);
    }));
    sanitizeDistanceLanguage(host);
  }

  function openSongGesture(profile) {
    if (typeof openFeatureModal !== "function") return;
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Musical gesture</p><h3>Send a song to ${profile.first || profile.name.split(" ")[0]}</h3></div><button class="icon-button" data-close-deliver-modal>×</button></div><div class="option-list"><button class="option-button" data-song-gesture="Grace">Grace · Jeff Buckley<span>Send</span></button><button class="option-button" data-song-gesture="Let Down">Let Down · Radiohead<span>Send</span></button><button class="option-button" data-song-gesture="Night Transit">Night Transit · Demo Library<span>Send</span></button></div>`);
    const modal = one("#feature-modal");
    one("[data-close-deliver-modal]", modal)?.addEventListener("click", closeFeatureModal);
    many("[data-song-gesture]", modal).forEach(button => button.addEventListener("click", () => { closeFeatureModal(); tell(`${button.dataset.songGesture} sent as a musical gesture.`); }));
  }

  function openSafetyMenu(profile) {
    if (typeof openFeatureModal !== "function") return;
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Safety controls</p><h3>${profile.name}</h3></div><button class="icon-button" data-close-deliver-modal>×</button></div><div class="option-list"><button class="option-button" data-safety-action="mute">Mute cultural posts<span>Private</span></button><button class="option-button" data-safety-action="unmatch">Unmatch or sever connection<span>Immediate</span></button><button class="option-button" data-safety-action="block">Block everywhere<span>Account-wide</span></button><button class="option-button" data-safety-action="report">Report profile<span>Status updates</span></button></div>`);
    const modal = one("#feature-modal");
    one("[data-close-deliver-modal]", modal)?.addEventListener("click", closeFeatureModal);
    many("[data-safety-action]", modal).forEach(button => button.addEventListener("click", () => { closeFeatureModal(); tell(`${button.dataset.safetyAction} action recorded in the demo safety workflow.`); }));
  }

  function previewPublicProfile() {
    if (typeof openFeatureModal !== "function") return;
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Public profile preview</p><h3>John Roastpork</h3></div><button class="icon-button" data-close-deliver-modal>×</button></div><div class="you-card" style="margin:0"><div class="avatar xl self-avatar"><b class="avatar-fallback">JR</b><img class="avatar-photo" src="avatars/john.roastpork.svg" alt=""></div><p class="eyebrow">Music identity</p><h3>John Roastpork</h3><p class="handle">@john.roastpork · Philadelphia</p><p class="bio">Finding Philadelphia one shared song at a time.</p><div class="identity-chips"><span>Night listener</span><span>Album-order loyalist</span><span>Open Door</span></div></div><div class="profile-depth-section" style="margin-top:12px"><p><strong>What others can see</strong></p><p>Anthem, top artists, selected diary entries, reviews, lists, communities, shared context, and clear privacy state.</p></div>`);
    one("[data-close-deliver-modal]", one("#feature-modal"))?.addEventListener("click", closeFeatureModal);
  }

  function openYouTool(tool) {
    const titles = {
      public: ["Public profile", "Edit identity, photos, anthem, biography, and visibility."],
      dating: ["Dating profile", "Separate gallery, intent, prompts, filters, albums, and field-level controls."],
      diary: ["Listening diary", "Private by default. Choose individual entries to publish."],
      reviews: ["Your reviews", "Music ratings and criticism usefulness remain distinct."],
      lists: ["Your lists", "Public, friends-only, or private collections."],
      recommendations: ["Recommendation controls", "See provenance, correct history, hide artists, and tune exploration."],
      matches: ["Matches", "Only reciprocal interest appears here."],
      communities: ["Communities", "Manage roles, stickers, visibility, and community feeds."],
      saved: ["Saved", "Profiles, reviews, lists, and posts saved privately."],
      account: ["Account & data", "Music providers, export, deletion, sessions, and sync status."],
    };
    const [title, copy] = titles[tool] || ["Your music life", "This surface belongs to the account owner."];
    if (typeof openFeatureModal !== "function") return;
    openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">You</p><h3>${title}</h3></div><button class="icon-button" data-close-deliver-modal>×</button></div><p class="modal-copy">${copy}</p><div class="profile-depth-section"><p><strong>Saved to account</strong></p><p>The production product must distinguish account sync, local offline drafts, unsynced work, and failures. This demo labels the intended state explicitly.</p></div>`);
    one("[data-close-deliver-modal]", one("#feature-modal"))?.addEventListener("click", closeFeatureModal);
  }

  function installFunctionOverrides() {
    if (typeof showViewSkeleton === "function") showViewSkeleton = () => {};

    if (typeof renderProfiles === "function") {
      const legacy = renderProfiles;
      renderProfiles = function deliverRenderProfiles(...args) { coarsenProfileLocations(); const result = legacy(...args); sanitizeDistanceLanguage(one("#profile-list") || document); return result; };
    }
    if (typeof renderRadar === "function") {
      const legacy = renderRadar;
      renderRadar = function deliverRenderRadar(...args) { coarsenProfileLocations(); const result = legacy(...args); sanitizeDistanceLanguage(one("#radar-panel") || document); return result; };
    }
    if (typeof renderAnchors === "function") {
      const legacy = renderAnchors;
      renderAnchors = function deliverRenderAnchors(...args) { const result = legacy(...args); sanitizeDistanceLanguage(one("#anchor-feed") || document); return result; };
    }
    if (typeof renderSwipeDeck === "function") {
      const legacy = renderSwipeDeck;
      renderSwipeDeck = function deliverRenderSwipeDeck(...args) { coarsenProfileLocations(); const result = legacy(...args); enhanceSwipeCard(); sanitizeDistanceLanguage(one("#swipe-deck") || document); return result; };
    }
    if (typeof renderReviews === "function") {
      const legacy = renderReviews;
      renderReviews = function deliverRenderReviews(...args) { const result = legacy(...args); enhanceReviewActions(); return result; };
    }
    if (typeof renderExchangePanels === "function") {
      const legacy = renderExchangePanels;
      renderExchangePanels = function deliverRenderExchangePanels(...args) { const result = legacy(...args); renderSupplementalExchange(); return result; };
    }
    if (typeof openProfile === "function") {
      const legacy = openProfile;
      openProfile = function deliverOpenProfile(username, ...args) { const result = legacy(username, ...args); enhanceProfile(username); return result; };
    }
    if (typeof switchView === "function") {
      const legacy = switchView;
      switchView = function deliverSwitchView(viewName, ...args) { const result = legacy(viewName, ...args); many(".view-skeleton").forEach(node => node.remove()); if (viewName === "messages") switchWavelengthPanel("friends"); sanitizeDistanceLanguage(document); return result; };
    }
    if (typeof setDatingMode === "function") {
      const legacy = setDatingMode;
      setDatingMode = function deliverSetDatingMode(enabled) {
        if (!enabled) { legacy(false); many("[data-dating-mode-toggle] small").forEach(label => { label.textContent = "Set up"; }); return; }
        let ready = false;
        try { ready = localStorage.getItem(DATING_READY_KEY) === "true"; } catch (_) {}
        if (ready) { enableDatingWorld(); if (typeof switchView === "function") switchView("discover"); tell("Dating Mode is on with reciprocal eligibility."); }
        else { if (typeof switchView === "function") switchView("messages"); switchWavelengthPanel("dating"); openDatingOnboarding(); }
      };
    }
  }

  function installEvents() {
    document.addEventListener("click", event => {
      const legacySwipe = event.target.closest("[data-swipe-action='pass'],[data-swipe-action='connect']");
      if (!legacySwipe) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (legacySwipe.dataset.swipeAction === "pass") handlePass();
      else handleSignal();
    }, true);

    document.addEventListener("click", event => {
      const viewButton = event.target.closest("[data-view]:not(.nav-item)");
      if (viewButton && typeof switchView === "function") switchView(viewButton.dataset.view);

      const hubButton = event.target.closest("[data-wavelength-hub]");
      if (hubButton) switchWavelengthPanel(hubButton.dataset.wavelengthHub);

      const customSwipe = event.target.closest("[data-deliver-swipe]");
      if (customSwipe) {
        const action = customSwipe.dataset.deliverSwipe;
        if (action === "save") handleSaveProfile();
        if (action === "undo") handleUndoPass();
        if (action === "why") explainCurrentPerson();
      }

      const requestAccept = event.target.closest("[data-request-accept]");
      if (requestAccept) {
        const card = requestAccept.closest("[data-live-request]");
        card?.remove();
        tell(requestAccept.dataset.requestType === "knock" ? "Knock accepted. Zuri can join this listen." : "Joining Hiroshi at the same playback moment.");
      }
      const requestDecline = event.target.closest("[data-request-decline]");
      if (requestDecline) { requestDecline.closest("[data-live-request]")?.remove(); tell("Request saved for later."); }

      const recAction = event.target.closest("[data-rec-action]");
      if (recAction) {
        const item = recommendationData[Number(recAction.dataset.recIndex)];
        const action = recAction.dataset.recAction;
        if (action === "play" || action === "tether") {
          if (typeof state !== "undefined") state.currentTrack = { name: item.title, artist: item.artist, album: item.album, durationSeconds: 300, progressPercent: 0, provider: "spotify" };
          if (typeof renderHome === "function") renderHome();
          if (action === "tether" && typeof openCurrentListening === "function") openCurrentListening();
          else tell(`${item.title} is now playing.`);
        } else if (action === "why") {
          if (typeof openFeatureModal === "function") {
            openFeatureModal(`<div class="modal-head"><div><p class="eyebrow">Recommendation provenance</p><h3>${item.title}</h3></div><button class="icon-button" data-close-deliver-modal>×</button></div><p class="modal-copy">${item.explanation}</p><div class="profile-depth-chips">${item.provenance.map(label => `<span>${label}</span>`).join("")}</div><p class="modal-copy">Tether does not claim metaphysical certainty. “No listen found” means connected history contains no observed play.</p>`);
            one("[data-close-deliver-modal]", one("#feature-modal"))?.addEventListener("click", closeFeatureModal);
          }
        } else tell(action === "known" ? "History corrected: you already know this track." : action === "send" ? "Choose a person to receive this track." : "Saved to your account.");
      }

      const exchangeAction = event.target.closest("[data-exchange-action]");
      if (exchangeAction) tell(`${exchangeAction.dataset.exchangeAction} action recorded. Exchange ranking learns from meaningful outcomes, not raw impressions.`);

      const startDating = event.target.closest("[data-start-dating-onboarding]");
      if (startDating) openDatingOnboarding();
      if (event.target.closest("[data-preview-dating-profile]")) previewDatingProfile();
      if (event.target.closest("[data-open-wavelength-filters]")) openWavelengthFilters();
      if (event.target.closest("[data-open-full-discovery]")) { if (typeof switchView === "function") switchView("discover"); if (typeof switchDiscoverMode === "function") switchDiscoverMode("grid"); }

      const community = event.target.closest("[data-community-index]");
      if (community) { if (typeof switchView === "function") switchView("activity"); tell(`${communities[Number(community.dataset.communityIndex)][0]} opened in Exchange.`); }
      const scene = event.target.closest("[data-local-scene]");
      if (scene) { if (typeof switchView === "function") switchView("activity"); many("[data-memory-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.memoryTab === "local")); many("[data-memory-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.memoryPanel === "local")); }

      const youTool = event.target.closest("[data-you-tool]");
      if (youTool) openYouTool(youTool.dataset.youTool);
      if (event.target.closest("[data-edit-public-profile]")) openYouTool("public");
      if (event.target.closest("[data-preview-public-profile]")) previewPublicProfile();

      if (event.target.closest("[data-header-inbox]")) { if (typeof switchView === "function") switchView("messages"); switchWavelengthPanel("friends"); }
      if (event.target.closest("[data-sync-explainer]")) tell("This Pages build uses seeded demo data. Account-sync labels show the intended production state.");
      if (event.target.closest("[data-recommendation-help]")) tell("Recommendations combine behavioral, content, social, and exploration evidence.");
      if (event.target.closest("[data-memory-retether]") && typeof openCurrentListening === "function") openCurrentListening();
      if (event.target.closest("[data-memory-open]") && typeof switchView === "function") { switchView("you"); one("#anchors-tab")?.click(); }
    });

    many(".privacy-matrix button").forEach(button => button.addEventListener("click", () => {
      const states = ["Public", "After match", "Filter only", "Do not use"];
      button.textContent = states[(states.indexOf(button.textContent) + 1) % states.length];
      tell(`Field visibility changed to ${button.textContent}.`);
    }));
  }

  function initializeAuditUI() {
    coarsenProfileLocations();
    if (typeof anchors !== "undefined") {
      const bands = ["In your city", "Nearby", "In your city"];
      anchors.forEach((anchor, index) => { anchor.distance = bands[index % bands.length]; });
    }
    many(".view-skeleton").forEach(node => node.remove());
    renderKnocks();
    renderRecommendations();
    renderResurfacedMemory();
    renderSupplementalExchange();
    renderCommunities();
    let ready = false;
    try { ready = localStorage.getItem(DATING_READY_KEY) === "true"; } catch (_) {}
    updateDatingReadiness(ready);
    sanitizeDistanceLanguage(document);
    installEvents();
  }

  installFunctionOverrides();
  initializeAuditUI();
})();
