(() => {
  "use strict";

  const one = (selector, root = document) => root.querySelector(selector);
  const many = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "tether.demo.dating-world.v4";
  const TABS = ["cards", "grid", "signals", "profile"];

  const candidates = [
    {
      id: "zuri1188", first: "Zuri", age: 24, initials: "ZK", online: true,
      band: "Nearby", intent: "Long-term · slow burn", structure: "Monogamous",
      pronouns: "she/her", anthem: "Eusexua · FKA twigs",
      artists: ["Burna Boy", "Tems", "Amaarae"],
      communities: ["Philly nights", "Album people", "Queer joy"],
      prompt: "A green flag is…", answer: "letting the outro finish before you say anything.",
      bio: "Tiny venues, huge bridges, and very specific walking playlists.",
      why: "Shared late-night listening, two overlapping communities, and compatible long-term intent.",
      colors: ["#9b82ff", "#ff6fae"], signal: "Send the song that makes the city feel cinematic."
    },
    {
      id: "realhiroshi", first: "Hiroshi", age: 23, initials: "HT", online: true,
      band: "In your city", intent: "Dates · friendship first", structure: "Open to discussing",
      pronouns: "he/him", anthem: "Aruarian Dance · Nujabes",
      artists: ["Nujabes", "Ryuichi Sakamoto", "KAYTRANADA"],
      communities: ["Beat heads", "Film scores", "Night listeners"],
      prompt: "The fastest way to know me…", answer: "is hearing the transition I am currently obsessed with.",
      bio: "Record-store wandering and long SEPTA rides with one album on repeat.",
      why: "Shared KAYTRANADA history and reciprocal interest in friendship-first dating.",
      colors: ["#4ac9d8", "#5068ff"], signal: "Trade me one perfect instrumental."
    },
    {
      id: "aaliyah9327", first: "Aaliyah", age: 22, initials: "AM", online: false,
      band: "Nearby", intent: "Long-term", structure: "Monogamous",
      pronouns: "she/her", anthem: "Snooze · SZA",
      artists: ["SZA", "Doechii", "Kendrick Lamar"],
      communities: ["R&B heads", "Concert regulars", "Philly food"],
      prompt: "We will get along if…", answer: "you have one album you defend like a dissertation.",
      bio: "I plan the date, you pick the first song in the car.",
      why: "Mutual SZA listening and compatible relationship structure.",
      colors: ["#ff9f64", "#d94d8a"], signal: "What song would you put on during the drive home?"
    },
    {
      id: "raj_539", first: "Raj", age: 25, initials: "RS", online: true,
      band: "In your city", intent: "Dating · open to long-term", structure: "Monogamous",
      pronouns: "he/him", anthem: "N95 · Kendrick Lamar",
      artists: ["A.R. Rahman", "Little Simz", "Radiohead"],
      communities: ["Movie music", "Indie shows", "Math people"],
      prompt: "A very specific invitation…", answer: "coffee, one shared earbud, and no shuffled albums.",
      bio: "Equal parts film-score person and basement-show person.",
      why: "Radiohead overlap, shared city band, and compatible dating intent.",
      colors: ["#f0b34d", "#a24bea"], signal: "Send your most dramatic walk-home song."
    },
    {
      id: "amanda_127", first: "Amanda", age: 24, initials: "AL", online: false,
      band: "Region", intent: "Dates · new friends", structure: "Open to discussing",
      pronouns: "she/they", anthem: "Be Sweet · Japanese Breakfast",
      artists: ["Japanese Breakfast", "Rina Sawayama", "Charli xcx"],
      communities: ["Pop maximalists", "Queer Philly", "Live shows"],
      prompt: "My ideal first date…", answer: "a show where we both pretend we knew the opener already.",
      bio: "Pop maximalist with a soft spot for sad guitar music.",
      why: "Japanese Breakfast overlap and shared live-show communities.",
      colors: ["#ff7fbb", "#755eff"], signal: "What opener did you discover before the headliner?"
    },
    {
      id: "realkevin", first: "Kevin", age: 26, initials: "KB", online: true,
      band: "Region", intent: "Long-term · friendship first", structure: "Monogamous",
      pronouns: "he/him", anthem: "Evergreen · Omar Apollo",
      artists: ["Fleet Foxes", "Noah Kahan", "Tyler Childers"],
      communities: ["Acoustic people", "Sunday mornings", "Hikers"],
      prompt: "The little thing I notice…", answer: "when someone knows exactly where the harmony enters.",
      bio: "Soft-spoken until the bridge hits. Then I have opinions.",
      why: "Compatible long-term intent and complementary listening habits.",
      colors: ["#70b58b", "#c58c54"], signal: "Send the song you play when the weather changes."
    }
  ];

  const defaults = {
    onboarded: true,
    discoverable: true,
    activeTab: "cards",
    cardIndex: 0,
    saved: [],
    passed: [],
    signaled: [],
    matches: ["zuri1188"],
    unreadSignals: 2,
    profile: {
      firstName: "John", dob: "2004-07-07", identity: "Man", pronouns: "he/him",
      showMe: "Men and women", intent: "Long-term relationship",
      structure: "Monogamous", bio: "Finding Philadelphia one shared song at a time.",
      anthem: "Grace · Jeff Buckley", proximity: "In my city", ageRange: "21–30"
    }
  };

  let model = loadModel();
  let recentPass = null;
  let onboardingStep = 0;

  function loadModel() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return { ...defaults, ...(saved || {}), profile: { ...defaults.profile, ...(saved?.profile || {}) } };
    } catch (_) {
      return structuredClone(defaults);
    }
  }

  function saveModel() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); } catch (_) {}
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function tell(message) {
    if (typeof globalThis.toast === "function") return globalThis.toast(message);
    const host = one("#toast");
    if (!host) return;
    host.textContent = message;
    host.classList.add("show");
    setTimeout(() => host.classList.remove("show"), 2300);
  }

  function avatarUrl(id) {
    try {
      if (typeof profileByUsername === "function") return profileByUsername(id)?.avatarUrl || "";
    } catch (_) {}
    return "";
  }

  function portrait(candidate, className = "dating-portrait") {
    const url = avatarUrl(candidate.id);
    return `<span class="${className}" style="--dating-a:${candidate.colors[0]};--dating-b:${candidate.colors[1]}">
      <b>${escapeHtml(candidate.initials)}</b>
      ${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      <i></i><i></i>
    </span>`;
  }

  function currentCandidate() {
    const available = candidates.filter(candidate => !model.passed.includes(candidate.id));
    if (!available.length) return null;
    model.cardIndex = Math.min(model.cardIndex, available.length - 1);
    return available[model.cardIndex];
  }

  function openModal(markup) {
    if (typeof globalThis.openFeatureModal === "function") {
      globalThis.openFeatureModal(`<div class="dating-modal-shell">${markup}</div>`);
      return one("#feature-modal");
    }
    const host = one("#feature-modal");
    if (!host) return null;
    host.innerHTML = `<div class="dating-modal-shell">${markup}</div>`;
    host.classList.add("open");
    return host;
  }

  function closeModal() {
    if (typeof globalThis.closeFeatureModal === "function") globalThis.closeFeatureModal();
    else one("#feature-modal")?.classList.remove("open");
  }

  function shellMarkup() {
    const active = TABS.includes(model.activeTab) ? model.activeTab : "cards";
    return `<section class="dating-world" data-dating-world>
      <header class="dating-world-hero">
        <div class="dating-world-hero-glow"></div>
        <div class="dating-world-hero-top">
          <span class="dating-mode-mark"><i></i> Dating on Wavelength</span>
          <button class="dating-visibility-toggle ${model.discoverable ? "is-on" : ""}" data-dating-visibility aria-pressed="${model.discoverable}">
            <i></i><span>${model.discoverable ? "Visible" : "Hidden"}</span>
          </button>
        </div>
        <div class="dating-world-identity">
          <div><p>Music-first discovery</p><h2>${escapeHtml(model.profile.firstName)}, 22</h2><span>${escapeHtml(model.profile.intent)} · ${escapeHtml(model.profile.proximity)}</span></div>
          <button data-dating-edit-profile>Edit setup</button>
        </div>
        <div class="dating-world-principles"><span>Mutual before messaging</span><span>Broad location only</span><span>Private Signals</span></div>
      </header>

      <nav class="dating-world-tabs" role="tablist" aria-label="Dating sections">
        ${tabButton("cards", "Cards", "Swipe")}
        ${tabButton("grid", "Browse", "Nearby")}
        ${tabButton("signals", "Signals", model.unreadSignals ? `${model.unreadSignals} new` : "Matches")}
        ${tabButton("profile", "You", "Profile")}
      </nav>

      <div class="dating-world-panel ${active === "cards" ? "active" : ""}" data-dating-world-panel="cards"></div>
      <div class="dating-world-panel ${active === "grid" ? "active" : ""}" data-dating-world-panel="grid"></div>
      <div class="dating-world-panel ${active === "signals" ? "active" : ""}" data-dating-world-panel="signals"></div>
      <div class="dating-world-panel ${active === "profile" ? "active" : ""}" data-dating-world-panel="profile"></div>
    </section>`;
  }

  function tabButton(id, label, meta) {
    const active = model.activeTab === id;
    return `<button class="${active ? "active" : ""}" role="tab" aria-selected="${active}" data-dating-tab="${id}"><b>${label}</b><small>${meta}</small></button>`;
  }

  function renderWorld() {
    const panel = one('[data-wavelength-panel="dating"]');
    if (!panel) return;
    panel.innerHTML = shellMarkup();
    panel.classList.add("dating-world-host");
    renderActivePanel();
    wireShell();
  }

  function renderActivePanel() {
    renderCards();
    renderGrid();
    renderSignals();
    renderProfile();
  }

  function renderCards() {
    const host = one('[data-dating-world-panel="cards"]');
    if (!host) return;
    const candidate = currentCandidate();
    if (!candidate) {
      host.innerHTML = `<div class="dating-empty-state"><span>✦</span><h3>You reached the edge of this demo pool.</h3><p>Undo a pass or reset the deck to keep exploring.</p><button data-dating-reset>Reset cards</button></div>`;
      one("[data-dating-reset]", host)?.addEventListener("click", () => {
        model.passed = []; model.cardIndex = 0; saveModel(); renderCards();
      });
      return;
    }
    const saved = model.saved.includes(candidate.id);
    const signaled = model.signaled.includes(candidate.id);
    host.innerHTML = `<div class="dating-cards-toolbar">
      <div><span class="dating-live-dot"></span><strong>Selected for you</strong><small>Reciprocal eligibility + music evidence</small></div>
      <button data-dating-filters>Filters</button>
    </div>
    <article class="dating-feature-card" data-dating-card style="--dating-a:${candidate.colors[0]};--dating-b:${candidate.colors[1]}">
      <div class="dating-feature-photo">
        ${portrait(candidate, "dating-feature-portrait")}
        <span class="dating-photo-count">1 / 3</span>
        <span class="dating-online-state ${candidate.online ? "online" : ""}"><i></i>${candidate.online ? "Online now" : "Recently active"}</span>
        <div class="dating-feature-name"><div><h3>${escapeHtml(candidate.first)}, ${candidate.age}</h3><p>${escapeHtml(candidate.pronouns)} · ${escapeHtml(candidate.band)}</p></div></div>
      </div>
      <div class="dating-feature-body">
        <div class="dating-intent-row"><span>${escapeHtml(candidate.intent)}</span><span>${escapeHtml(candidate.structure)}</span></div>
        <p class="dating-feature-bio">${escapeHtml(candidate.bio)}</p>
        <button class="dating-anthem" data-dating-signal><i>♪</i><span><small>Their anthem</small><strong>${escapeHtml(candidate.anthem)}</strong></span><b>Signal</b></button>
        <div class="dating-artist-row">${candidate.artists.map(artist => `<span>${escapeHtml(artist)}</span>`).join("")}</div>
        <div class="dating-prompt"><small>${escapeHtml(candidate.prompt)}</small><p>${escapeHtml(candidate.answer)}</p></div>
        <button class="dating-why" data-dating-why><span>Why this person?</span><small>${escapeHtml(candidate.why)}</small></button>
      </div>
    </article>
    <div class="dating-card-actions">
      <button class="pass" data-dating-pass><b>×</b><small>Pass</small></button>
      <button class="save ${saved ? "active" : ""}" data-dating-save><b>▱</b><small>${saved ? "Saved" : "Save"}</small></button>
      <button class="profile" data-dating-open-profile><b>◎</b><small>Profile</small></button>
      <button class="signal ${signaled ? "active" : ""}" data-dating-signal><b>✦</b><small>${signaled ? "Sent" : "Signal"}</small></button>
    </div>
    <div class="dating-card-footer"><button data-dating-undo ${recentPass ? "" : "disabled"}>↶ Undo pass</button><span>Messaging opens only after mutual interest.</span></div>`;

    one("[data-dating-pass]", host)?.addEventListener("click", passCurrent);
    one("[data-dating-save]", host)?.addEventListener("click", saveCurrent);
    many("[data-dating-signal]", host).forEach(button => button.addEventListener("click", signalCurrent));
    one("[data-dating-open-profile]", host)?.addEventListener("click", () => openCandidate(candidate));
    one("[data-dating-why]", host)?.addEventListener("click", () => openWhy(candidate));
    one("[data-dating-undo]", host)?.addEventListener("click", undoPass);
    one("[data-dating-filters]", host)?.addEventListener("click", openFilters);
    enableCardDrag(one("[data-dating-card]", host));
  }

  function renderGrid() {
    const host = one('[data-dating-world-panel="grid"]');
    if (!host) return;
    host.innerHTML = `<div class="dating-grid-toolbar">
      <div><p class="eyebrow">Browse without exact distance</p><h3>People in your bands</h3></div>
      <button data-dating-filters>Filter</button>
    </div>
    <div class="dating-browse-grid">${candidates.map(candidate => `
      <button class="dating-grid-person" data-dating-person="${candidate.id}" style="--dating-a:${candidate.colors[0]};--dating-b:${candidate.colors[1]}">
        ${portrait(candidate, "dating-grid-portrait")}
        <span class="dating-grid-online ${candidate.online ? "online" : ""}"></span>
        <strong>${escapeHtml(candidate.first)}, ${candidate.age}</strong>
        <small>${escapeHtml(candidate.band)}</small>
        <em>${escapeHtml(candidate.intent.split(" · ")[0])}</em>
      </button>`).join("")}</div>
    <p class="dating-grid-note">Grid order mixes activity and music relevance. It never reveals who is physically closest.</p>`;
    many("[data-dating-person]", host).forEach(button => button.addEventListener("click", () => openCandidate(candidates.find(c => c.id === button.dataset.datingPerson))));
    one("[data-dating-filters]", host)?.addEventListener("click", openFilters);
  }

  function renderSignals() {
    const host = one('[data-dating-world-panel="signals"]');
    if (!host) return;
    const matched = candidates.filter(candidate => model.matches.includes(candidate.id));
    host.innerHTML = `<section class="dating-signal-intro">
      <div><p class="eyebrow">Wizz-style openings, Tether rules</p><h3>Signals are songs, not cold DMs.</h3><p>Send one musical object and a short thought. Conversation unlocks only after mutual interest.</p></div>
      <button data-dating-compose-signal>Send a Signal</button>
    </section>
    <div class="dating-signal-section-head"><div><h3>New Signals</h3><small>Private until you respond</small></div><span>${model.unreadSignals}</span></div>
    <div class="dating-signal-list">
      ${signalCard(candidates[1], "Aruarian Dance · Nujabes", "This felt like your late-night playlists.", false)}
      ${signalCard(candidates[4], "Be Sweet · Japanese Breakfast", "You had this in your Top 5, right?", false)}
    </div>
    <div class="dating-signal-section-head"><div><h3>Matches</h3><small>Mutual interest unlocked messaging</small></div><span>${matched.length}</span></div>
    <div class="dating-match-list">${matched.length ? matched.map(matchCard).join("") : `<p class="dating-empty-copy">Mutual matches will appear here.</p>`}</div>
    <div class="dating-saved-strip"><div><h3>Saved privately</h3><small>No notification was sent</small></div><div>${model.saved.map(id => {
      const candidate = candidates.find(item => item.id === id); return candidate ? `<button data-dating-person="${candidate.id}">${portrait(candidate, "dating-saved-avatar")}<span>${candidate.first}</span></button>` : "";
    }).join("") || `<span class="dating-empty-copy">No saved profiles yet.</span>`}</div></div>`;
    many("[data-dating-person]", host).forEach(button => button.addEventListener("click", () => openCandidate(candidates.find(c => c.id === button.dataset.datingPerson))));
    many("[data-dating-reply-signal]", host).forEach(button => button.addEventListener("click", () => respondToSignal(button.dataset.datingReplySignal)));
    many("[data-dating-chat]", host).forEach(button => button.addEventListener("click", () => openMatchChat(button.dataset.datingChat)));
    one("[data-dating-compose-signal]", host)?.addEventListener("click", openSignalComposer);
  }

  function signalCard(candidate, track, note, mutual) {
    return `<article class="dating-signal-card">
      ${portrait(candidate, "dating-signal-avatar")}
      <div><div class="dating-signal-meta"><strong>${escapeHtml(candidate.first)}, ${candidate.age}</strong><span>${escapeHtml(candidate.band)}</span></div><p>${escapeHtml(note)}</p><button class="dating-signal-track"><i>♪</i><span>${escapeHtml(track)}</span></button></div>
      <button data-dating-reply-signal="${candidate.id}">${mutual ? "Open" : "Respond"}</button>
    </article>`;
  }

  function matchCard(candidate) {
    return `<article class="dating-match-card">
      ${portrait(candidate, "dating-match-avatar")}
      <div><strong>${escapeHtml(candidate.first)}</strong><small>Matched through mutual music interest</small><span>${escapeHtml(candidate.anthem)}</span></div>
      <button data-dating-chat="${candidate.id}">Message</button>
    </article>`;
  }

  function renderProfile() {
    const host = one('[data-dating-world-panel="profile"]');
    if (!host) return;
    host.innerHTML = `<section class="dating-profile-preview-card">
      <div class="dating-profile-preview-photo"><span>JR</span><i></i><i></i><small>2 public photos · private album off</small></div>
      <div><p class="eyebrow">Your Dating profile</p><h3>${escapeHtml(model.profile.firstName)}, 22</h3><p>${escapeHtml(model.profile.bio)}</p><div class="dating-artist-row"><span>Jeff Buckley</span><span>Radiohead</span><span>Japanese Breakfast</span></div><button data-dating-edit-profile>Edit profile</button></div>
    </section>
    <section class="dating-control-card">
      <div class="dating-control-head"><div><p class="eyebrow">Discoverability</p><h3>${model.discoverable ? "You can appear to eligible people" : "Your profile is hidden"}</h3></div><button class="dating-visibility-toggle ${model.discoverable ? "is-on" : ""}" data-dating-visibility><i></i><span>${model.discoverable ? "Visible" : "Hidden"}</span></button></div>
      <p>Eligibility is reciprocal. Exact distance, filter-only fields, and private albums are never published.</p>
    </section>
    <section class="dating-control-card">
      <p class="eyebrow">Field-level privacy</p><h3>Choose what each detail does</h3>
      <div class="dating-visibility-matrix">
        <span>Height</span><button data-visibility-cycle>After match</button>
        <span>Relationship structure</span><button data-visibility-cycle>Public</button>
        <span>Position</span><button data-visibility-cycle>Filter only</button>
        <span>Health information</span><button data-visibility-cycle>Do not use</button>
      </div>
    </section>
    <section class="dating-control-card dating-safety-card"><p class="eyebrow">Safety center</p><h3>Control the relationship boundary</h3><div><button data-dating-safety>Blocked accounts</button><button data-dating-safety>Reports</button><button data-dating-safety>Private albums</button><button data-dating-safety>Pause Dating</button></div></section>`;
    many("[data-dating-edit-profile]", host).forEach(button => button.addEventListener("click", () => openOnboarding(0)));
    many("[data-dating-visibility]", host).forEach(button => button.addEventListener("click", toggleVisibility));
    many("[data-visibility-cycle]", host).forEach(button => button.addEventListener("click", cycleVisibility));
    many("[data-dating-safety]", host).forEach(button => button.addEventListener("click", () => tell(`${button.textContent.trim()} opened in the Dating safety center.`)));
  }

  function wireShell() {
    many("[data-dating-tab]").forEach(button => button.addEventListener("click", () => switchTab(button.dataset.datingTab)));
    many("[data-dating-visibility]").forEach(button => button.addEventListener("click", toggleVisibility));
    one("[data-dating-edit-profile]")?.addEventListener("click", () => openOnboarding(0));
  }

  function switchTab(tab) {
    if (!TABS.includes(tab)) return;
    model.activeTab = tab;
    saveModel();
    many("[data-dating-tab]").forEach(button => {
      const active = button.dataset.datingTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    many("[data-dating-world-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.datingWorldPanel === tab));
    renderActivePanel();
  }

  function passCurrent() {
    const candidate = currentCandidate();
    if (!candidate) return;
    recentPass = candidate.id;
    model.passed.push(candidate.id);
    model.cardIndex = 0;
    saveModel();
    tell(`${candidate.first} was passed privately. Undo is available.`);
    renderCards();
  }

  function undoPass() {
    if (!recentPass) return tell("There is no recent pass to undo.");
    model.passed = model.passed.filter(id => id !== recentPass);
    const restored = candidates.find(candidate => candidate.id === recentPass);
    recentPass = null;
    saveModel();
    renderCards();
    tell(`${restored?.first || "Profile"} is back in your cards.`);
  }

  function saveCurrent() {
    const candidate = currentCandidate();
    if (!candidate) return;
    model.saved = model.saved.includes(candidate.id) ? model.saved.filter(id => id !== candidate.id) : [...model.saved, candidate.id];
    saveModel();
    renderCards();
    tell(model.saved.includes(candidate.id) ? `${candidate.first} was saved privately.` : `${candidate.first} was removed from Saved.`);
  }

  function signalCurrent() {
    const candidate = currentCandidate();
    if (!candidate) return;
    if (!model.signaled.includes(candidate.id)) model.signaled.push(candidate.id);
    saveModel();
    openSignalComposer(candidate);
  }

  function respondToSignal(id) {
    const candidate = candidates.find(item => item.id === id);
    if (!candidate) return;
    if (!model.matches.includes(id)) model.matches.push(id);
    model.unreadSignals = Math.max(0, model.unreadSignals - 1);
    saveModel();
    showMatch(candidate);
  }

  function toggleVisibility() {
    model.discoverable = !model.discoverable;
    saveModel();
    renderWorld();
    tell(model.discoverable ? "Dating profile is visible to reciprocally eligible people." : "Dating profile is hidden. Existing matches remain available.");
  }

  function cycleVisibility(event) {
    const values = ["Public", "After match", "Filter only", "Do not use"];
    const button = event.currentTarget;
    button.textContent = values[(values.indexOf(button.textContent.trim()) + 1) % values.length];
    tell("Visibility changed in this interactive prototype.");
  }

  function enableCardDrag(card) {
    if (!card) return;
    let dragging = false, startX = 0, deltaX = 0;
    card.addEventListener("pointerdown", event => {
      if (event.target.closest("button")) return;
      dragging = true; startX = event.clientX; deltaX = 0;
      card.setPointerCapture?.(event.pointerId);
      card.classList.add("dragging");
    });
    card.addEventListener("pointermove", event => {
      if (!dragging) return;
      deltaX = event.clientX - startX;
      card.style.transform = `translateX(${deltaX}px) rotate(${deltaX / 22}deg)`;
      card.dataset.direction = deltaX > 35 ? "signal" : deltaX < -35 ? "pass" : "";
    });
    const finish = () => {
      if (!dragging) return;
      dragging = false; card.classList.remove("dragging"); card.style.transform = ""; delete card.dataset.direction;
      if (deltaX > 92) signalCurrent(); else if (deltaX < -92) passCurrent();
    };
    card.addEventListener("pointerup", finish);
    card.addEventListener("pointercancel", finish);
  }

  function openCandidate(candidate) {
    if (!candidate) return;
    const host = openModal(`<div class="modal-head"><div><p class="eyebrow">Full Dating profile</p><h3>${escapeHtml(candidate.first)}, ${candidate.age}</h3></div><button class="icon-button" data-dating-close aria-label="Close">×</button></div>
      <div class="dating-profile-gallery"><div style="--dating-a:${candidate.colors[0]};--dating-b:${candidate.colors[1]}">${portrait(candidate, "dating-modal-portrait")}<small>Public photo</small></div><div style="--dating-a:${candidate.colors[1]};--dating-b:${candidate.colors[0]}"><span class="dating-photo-art">♪</span><small>Live-show photo</small></div><button><span>＋</span><small>Request private album after matching</small></button></div>
      <section class="dating-modal-section"><div class="dating-intent-row"><span>${escapeHtml(candidate.intent)}</span><span>${escapeHtml(candidate.structure)}</span><span>${escapeHtml(candidate.band)}</span></div><p>${escapeHtml(candidate.bio)}</p></section>
      <section class="dating-modal-section"><p class="eyebrow">Their musical interior</p><h4>${escapeHtml(candidate.anthem)}</h4><div class="dating-artist-row">${candidate.artists.map(a => `<span>${escapeHtml(a)}</span>`).join("")}</div></section>
      <section class="dating-modal-section"><small>${escapeHtml(candidate.prompt)}</small><p class="dating-large-answer">${escapeHtml(candidate.answer)}</p></section>
      <section class="dating-modal-section"><p class="eyebrow">Why shown</p><p>${escapeHtml(candidate.why)}</p><small>Broad proximity only. No exact-mile ordering.</small></section>
      <div class="dating-modal-actions"><button data-dating-modal-pass>Pass</button><button data-dating-modal-save>Save</button><button class="primary" data-dating-modal-signal>Send Signal</button></div>`);
    if (!host) return;
    one("[data-dating-close]", host)?.addEventListener("click", closeModal);
    one("[data-dating-modal-pass]", host)?.addEventListener("click", () => { closeModal(); if (currentCandidate()?.id === candidate.id) passCurrent(); else { model.passed.push(candidate.id); saveModel(); renderWorld(); } });
    one("[data-dating-modal-save]", host)?.addEventListener("click", () => { if (!model.saved.includes(candidate.id)) model.saved.push(candidate.id); saveModel(); closeModal(); renderWorld(); tell(`${candidate.first} was saved privately.`); });
    one("[data-dating-modal-signal]", host)?.addEventListener("click", () => { closeModal(); openSignalComposer(candidate); });
  }

  function openWhy(candidate) {
    const host = openModal(`<div class="modal-head"><div><p class="eyebrow">Why this person?</p><h3>${escapeHtml(candidate.first)}</h3></div><button class="icon-button" data-dating-close>×</button></div>
      <div class="dating-evidence-stack"><article><b>Observed</b><p>Overlapping artists and listening patterns from connected music activity.</p></article><article><b>Self-declared</b><p>Compatible intent, relationship structure, and public communities.</p></article><article><b>Location</b><p>${escapeHtml(candidate.band)}. Exact coordinates and nearest-first order are not shown.</p></article><article><b>Not used</b><p>Private messages, raw searches, filter-only fields, and private albums.</p></article></div>`);
    one("[data-dating-close]", host)?.addEventListener("click", closeModal);
  }

  function openSignalComposer(candidate = currentCandidate()) {
    if (!candidate) return;
    const host = openModal(`<div class="modal-head"><div><p class="eyebrow">Send a private Signal</p><h3>Lead with a song, not a cold DM.</h3></div><button class="icon-button" data-dating-close>×</button></div>
      <div class="dating-signal-recipient">${portrait(candidate, "dating-signal-avatar")}<div><strong>${escapeHtml(candidate.first)}</strong><small>${escapeHtml(candidate.signal)}</small></div></div>
      <label class="dating-composer-label">Song<select data-signal-track><option>Grace · Jeff Buckley</option><option>Let Down · Radiohead</option><option>Be Sweet · Japanese Breakfast</option><option>Myth · Beach House</option></select></label>
      <label class="dating-composer-label">Thought<textarea rows="3" maxlength="180">This made me think you might understand my exact kind of dramatic.</textarea></label>
      <p class="dating-modal-note">They can respond, pass, or save. Messaging stays locked unless interest becomes mutual.</p>
      <div class="dating-modal-actions"><button data-dating-close>Cancel</button><button class="primary" data-send-signal>Send Signal</button></div>`);
    many("[data-dating-close]", host).forEach(button => button.addEventListener("click", closeModal));
    one("[data-send-signal]", host)?.addEventListener("click", () => {
      if (!model.signaled.includes(candidate.id)) model.signaled.push(candidate.id);
      saveModel(); closeModal(); renderWorld();
      if (candidate.id === "zuri1188") showMatch(candidate); else tell(`Signal sent privately to ${candidate.first}.`);
    });
  }

  function showMatch(candidate) {
    if (!model.matches.includes(candidate.id)) model.matches.push(candidate.id);
    saveModel();
    const host = openModal(`<div class="dating-match-celebration" style="--dating-a:${candidate.colors[0]};--dating-b:${candidate.colors[1]}"><div class="dating-match-orbits"><span>JR</span>${portrait(candidate, "dating-match-orbit-avatar")}</div><p class="eyebrow">Mutual music interest</p><h2>You and ${escapeHtml(candidate.first)} matched.</h2><p>Your Signal opened a conversation. Start with the song, or open a Tether when one of you is listening.</p><div class="dating-modal-actions"><button data-dating-close>Keep browsing</button><button class="primary" data-open-match-chat>Message ${escapeHtml(candidate.first)}</button></div></div>`);
    one("[data-dating-close]", host)?.addEventListener("click", () => { closeModal(); renderWorld(); });
    one("[data-open-match-chat]", host)?.addEventListener("click", () => { closeModal(); openMatchChat(candidate.id); });
  }

  function openMatchChat(id) {
    const candidate = candidates.find(item => item.id === id);
    if (!candidate) return;
    const host = openModal(`<div class="modal-head"><div class="dating-chat-person">${portrait(candidate, "dating-signal-avatar")}<div><p class="eyebrow">Matched through a Signal</p><h3>${escapeHtml(candidate.first)}</h3></div></div><button class="icon-button" data-dating-close>×</button></div>
      <div class="dating-chat-thread"><div class="theirs"><small>${escapeHtml(candidate.anthem)}</small><p>Your Signal was honestly perfect timing.</p></div><div class="mine"><p>I had a feeling you would get it.</p></div><div class="theirs"><p>Want to Tether later tonight?</p></div></div>
      <div class="dating-chat-actions"><button data-preview-tether>Open a Tether</button><label><input placeholder="Message ${escapeHtml(candidate.first)}"><button aria-label="Send">↑</button></label></div>`);
    one("[data-dating-close]", host)?.addEventListener("click", closeModal);
    one("[data-preview-tether]", host)?.addEventListener("click", () => { closeModal(); globalThis.openTetherAction?.(); tell("Tether invitation opened from the match conversation."); });
  }

  function openFilters() {
    const host = openModal(`<div class="modal-head"><div><p class="eyebrow">Reciprocal filters</p><h3>Who should be eligible?</h3></div><button class="icon-button" data-dating-close>×</button></div>
      <div class="dating-filter-grid"><label>Age range<select><option>21–30</option><option>22–35</option><option>18–99</option></select></label><label>Intent<select><option>Long-term</option><option>Dating</option><option>Friendship first</option><option>Any compatible intent</option></select></label><label>Broad proximity<select><option>Nearby</option><option selected>In my city</option><option>Within the region</option></select></label><label>Relationship structure<select><option>Compatible only</option><option>Show all, explain conflicts</option></select></label><label>Communities<select><option>Any</option><option>At least one shared</option></select></label><label>Music evidence<select><option>Use connected listening</option><option>Exploration mode</option></select></label></div>
      <p class="dating-modal-note">No core eligibility or safety control is paywalled.</p><div class="dating-modal-actions"><button data-dating-close>Cancel</button><button class="primary" data-apply-filters>Apply filters</button></div>`);
    many("[data-dating-close]", host).forEach(button => button.addEventListener("click", closeModal));
    one("[data-apply-filters]", host)?.addEventListener("click", () => { closeModal(); tell("Reciprocal Dating filters applied."); });
  }

  const onboardingSteps = ["Identity", "Photos", "Intent", "Music", "Privacy"];

  function onboardingMarkup() {
    const step = onboardingStep;
    let body = "";
    if (step === 0) body = `<div class="dating-form-grid two"><label>First name<input data-onboard-field="firstName" value="${escapeHtml(model.profile.firstName)}"></label><label>Date of birth<input data-onboard-field="dob" type="date" value="${escapeHtml(model.profile.dob)}"></label><label>Gender identity<select data-onboard-field="identity"><option>${escapeHtml(model.profile.identity)}</option><option>Woman</option><option>Nonbinary</option><option>Custom</option></select></label><label>Pronouns<input data-onboard-field="pronouns" value="${escapeHtml(model.profile.pronouns)}"></label><label class="full">Show me<select data-onboard-field="showMe"><option>${escapeHtml(model.profile.showMe)}</option><option>Men</option><option>Women</option><option>Nonbinary people</option><option>Multiple categories</option></select></label></div><p class="dating-modal-note">Date of birth is self-declared eligibility in this prototype, not identity verification.</p>`;
    if (step === 1) body = `<p class="dating-modal-copy">Two approved public photos are required before discoverability. Private albums remain individually shareable and revocable.</p><div class="dating-onboarding-photos"><button class="ready"><span>JR</span><small>Primary · public</small></button><button class="ready"><span>♪</span><small>Second · public</small></button><button><span>＋</span><small>Add media</small></button></div><div class="dating-private-album-row"><div><b>Private album</b><small>Grant only after matching; revoke anytime</small></div><button>Set up later</button></div>`;
    if (step === 2) body = `<div class="dating-form-grid"><label>Relationship intent<select data-onboard-field="intent"><option>${escapeHtml(model.profile.intent)}</option><option>Dating</option><option>Friendship first</option><option>Still exploring</option></select></label><label>Relationship structure<select data-onboard-field="structure"><option>${escapeHtml(model.profile.structure)}</option><option>Non-monogamous</option><option>Open to discussing</option></select></label><label>Bio<textarea data-onboard-field="bio" rows="4">${escapeHtml(model.profile.bio)}</textarea></label><label>Profile prompt<select><option>The fastest way to understand me…</option><option>A green flag is…</option><option>My ideal first date…</option></select></label><label>Prompt answer<textarea rows="3">is hearing the album I never shuffle.</textarea></label></div>`;
    if (step === 3) body = `<div class="dating-form-grid"><label>Anthem<select data-onboard-field="anthem"><option>${escapeHtml(model.profile.anthem)}</option><option>Let Down · Radiohead</option><option>Be Sweet · Japanese Breakfast</option><option>Myth · Beach House</option></select></label><div class="dating-onboard-music"><p class="eyebrow">Connected music identity</p><div><span>Jeff Buckley</span><span>Radiohead</span><span>Japanese Breakfast</span><span>Bon Iver</span></div></div><label>Music boundary<select><option>Show shared evidence, never a percentage</option><option>Exploration mode</option></select></label><label>Communities<select><option>Night listeners · Album-order loyalists</option><option>Choose communities</option></select></label></div>`;
    if (step === 4) body = `<div class="dating-form-grid"><label>Age range<select data-onboard-field="ageRange"><option>${escapeHtml(model.profile.ageRange)}</option><option>22–35</option><option>18–99</option></select></label><label>Location choice<select data-onboard-field="proximity"><option>${escapeHtml(model.profile.proximity)}</option><option>Nearby</option><option>Within the region</option></select></label><div class="dating-visibility-row"><span>Height</span><select><option>After match</option><option>Public</option><option>Filter only</option><option>Do not use</option></select></div><div class="dating-visibility-row"><span>Relationship structure</span><select><option>Public</option><option>After match</option><option>Filter only</option></select></div><div class="dating-visibility-row"><span>Position</span><select><option>Filter only</option><option>After match</option><option>Do not use</option></select></div><label class="dating-safety-check"><input type="checkbox" checked data-onboard-safety><span>I understand broad location bands, mutual matching, blocking, reporting, and private-album controls.</span></label></div>`;
    return `<div class="modal-head"><div><p class="eyebrow">Dating setup · ${onboardingSteps[step]}</p><h3>Build a complete, private profile</h3></div><button class="icon-button" data-dating-close>×</button></div><div class="dating-onboarding-progress">${onboardingSteps.map((name, index) => `<span class="${index <= step ? "active" : ""}"><i></i><small>${name}</small></span>`).join("")}</div>${body}<div class="dating-modal-actions">${step ? `<button data-onboard-back>Back</button>` : `<button data-dating-close>Cancel</button>`}<button class="primary" data-onboard-next>${step === onboardingSteps.length - 1 ? "Finish setup" : "Continue"}</button></div>`;
  }

  function openOnboarding(step = 0) {
    onboardingStep = Math.max(0, Math.min(onboardingSteps.length - 1, step));
    const host = openModal(onboardingMarkup());
    many("[data-dating-close]", host).forEach(button => button.addEventListener("click", closeModal));
    one("[data-onboard-back]", host)?.addEventListener("click", () => { captureOnboarding(host); openOnboarding(onboardingStep - 1); });
    one("[data-onboard-next]", host)?.addEventListener("click", () => {
      captureOnboarding(host);
      if (onboardingStep < onboardingSteps.length - 1) return openOnboarding(onboardingStep + 1);
      if (!one("[data-onboard-safety]", host)?.checked) return tell("Acknowledge the Dating safety controls to continue.");
      model.onboarded = true; model.discoverable = true; saveModel(); closeModal(); renderWorld(); tell("Dating profile ready. You control when it is discoverable.");
    });
  }

  function captureOnboarding(host) {
    many("[data-onboard-field]", host).forEach(field => { model.profile[field.dataset.onboardField] = field.value; });
    saveModel();
  }

  function rewireEntryButtons() {
    const selectors = ["[data-dating-mode-toggle]", "[data-wavelength-settings]", "[data-start-dating-onboarding]", '[data-you-tool="dating"]'];
    selectors.forEach(selector => many(selector).forEach(original => {
      if (original.dataset.datingWorldBound) return;
      const button = original.cloneNode(true);
      button.dataset.datingWorldBound = "true";
      original.replaceWith(button);
      button.addEventListener("click", () => {
        if (button.matches('[data-you-tool="dating"]') && typeof globalThis.switchView === "function") globalThis.switchView("messages");
        const datingTab = one('[data-wavelength-hub="dating"]');
        datingTab?.click();
        setTimeout(() => one("[data-dating-world]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      });
    }));
  }

  function install() {
    const panel = one('[data-wavelength-panel="dating"]');
    if (!panel || document.body.classList.contains("dating-world-v4")) return;
    document.body.classList.add("dating-world-v4");
    panel.querySelectorAll(":scope > .prototype-status").forEach(item => item.remove());
    renderWorld();
    rewireEntryButtons();
  }

  globalThis.TetherDatingWorld = { open: () => { one('[data-wavelength-hub="dating"]')?.click(); renderWorld(); }, edit: () => openOnboarding(0) };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
