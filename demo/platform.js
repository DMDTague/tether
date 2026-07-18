(() => {
  "use strict";

  const STORAGE_KEY = "tether:music-culture:v1";
  const defaults = {
    exchangeMode: "feed",
    diary: [
      { id: "d1", date: "2026-07-09", type: "album", title: "Imaginal Disk", artist: "Magdalena Bay", score: 4.5, note: "Maximal, melodic, and built like a world." },
      { id: "d2", date: "2026-07-08", type: "track", title: "Eusexua", artist: "FKA twigs", score: 5, note: "The dance floor as a spiritual practice." },
      { id: "d3", date: "2026-07-06", type: "album", title: "Blonde", artist: "Frank Ocean", score: 5, note: "Still rearranges the room around it." }
    ],
    lists: [
      { id: "l1", title: "Philadelphia after midnight", description: "Records for empty platforms, wet pavement, and the last bus home.", count: 18, saves: 42 },
      { id: "l2", title: "Albums that become architecture", description: "Music that feels less written than inhabited.", count: 12, saves: 31 },
      { id: "l3", title: "The bridge is the whole point", description: "Songs whose emotional argument arrives halfway through.", count: 24, saves: 67 }
    ],
    favorites: ["Blonde", "Vespertine", "Heaven or Las Vegas", "Dragon New Warm Mountain I Believe in You"],
    dating: {
      enabled: true,
      visible: true,
      identity: "Man",
      orientation: "Queer / open",
      intent: "Long-term, but let the music introduce us",
      relationship: "Monogamous",
      ageMin: 20,
      ageMax: 29,
      distance: 15,
      height: "5′7″",
      body: "Compact, built, permanently carrying headphones",
      priorityArtist: "Japanese Breakfast",
      dealbreakerArtist: "",
      priorityAlbum: "Blonde",
      genres: "Art pop, indie rock, hip-hop, soul",
      concerts: "Small rooms, standing room, weeknights welcome",
      prompt: "The song that would tell you too much about me is…",
      promptAnswer: "New Mistake by Jellyfish—bright enough to hide the damage.",
      showHeight: true,
      showBody: false
    }
  };

  let culture = load();
  let exchangeMode = culture.exchangeMode || "feed";
  let profileObserver = null;
  let deckObserver = null;

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return parsed ? { ...defaults, ...parsed, dating: { ...defaults.dating, ...(parsed.dating || {}) } } : structuredClone(defaults);
    } catch (_) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save() {
    culture.exchangeMode = exchangeMode;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(culture));
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function getState() {
    try { return state; } catch (_) { return null; }
  }

  function callLegacy(name, ...args) {
    try {
      const fn = globalThis[name] || eval(name);
      return typeof fn === "function" ? fn(...args) : undefined;
    } catch (_) {
      return undefined;
    }
  }

  function notify(message) {
    if (callLegacy("toast", message) !== undefined) return;
    const node = document.querySelector("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 2100);
  }

  function legacyReady() {
    return document.querySelector(".bottom-nav") && document.querySelector("#activity-view") && document.querySelector("#swipe-deck");
  }

  function waitForLegacy(attempt = 0) {
    if (legacyReady()) return install();
    if (attempt < 80) setTimeout(() => waitForLegacy(attempt + 1), 100);
  }

  function install() {
    if (document.body.classList.contains("music-everything")) return;
    document.body.classList.add("music-everything");
    installDialog();
    rebuildNavigation();
    installHomeCulture();
    installExchange();
    installWavelength();
    observeProfiles();
    enhanceCurrentProfile();
  }

  function installDialog() {
    if (document.querySelector("#platform-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "platform-dialog";
    dialog.className = "platform-dialog";
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    document.body.appendChild(dialog);
  }

  function openDialog(html, onReady) {
    const dialog = document.querySelector("#platform-dialog");
    dialog.innerHTML = `<form method="dialog" class="platform-dialog-shell"><button class="platform-close" value="cancel" aria-label="Close">×</button>${html}</form>`;
    dialog.showModal();
    if (onReady) onReady(dialog);
  }

  function rebuildNavigation() {
    const nav = document.querySelector(".bottom-nav");
    if (!nav || nav.dataset.platformReady) return;
    nav.dataset.platformReady = "true";
    const destinations = [...nav.querySelectorAll(".nav-item[data-view]")].map(button => button.dataset.view);
    if (destinations.join(",") !== "home,messages,you") {
      console.error("Tether primary navigation must remain Listen, People, You.");
    }
  }

  function installHomeCulture() {
    const home = document.querySelector("#home-view");
    const anchor = document.querySelector("#trending-session-list");
    const secondary = home?.querySelector(".explore-more-content");
    if (!home || (!secondary && !anchor) || home.querySelector(".platform-home-culture")) return;
    const section = document.createElement("section");
    section.className = "platform-home-culture";
    section.innerHTML = `
      <div class="home-section-head platform-section-head"><div><p class="eyebrow">Your music life</p><h3>Keep listening after the session ends</h3></div></div>
      <div class="platform-life-grid">
        <button data-platform-jump="diary"><span>${culture.diary.length}</span><strong>Diary entries</strong><small>Log what you heard</small></button>
        <button data-platform-jump="feed"><span>12</span><strong>Reviews</strong><small>Join the discourse</small></button>
        <button data-platform-jump="lists"><span>${culture.lists.length}</span><strong>Lists</strong><small>Curate your taste</small></button>
      </div>
      <article class="platform-exchange-preview">
        <div><p class="eyebrow">From The Exchange</p><h3>What your people are arguing about</h3></div>
        <button data-platform-jump="feed">Open feed</button>
        <div class="platform-preview-review"><b>4.5</b><span><strong>Imaginal Disk</strong><small>“Every synth choice feels like another doorway.” · 18m</small></span></div>
      </article>`;
    if (secondary) secondary.append(section);
    else anchor.insertAdjacentElement("afterend", section);
    section.querySelectorAll("[data-platform-jump]").forEach(button => button.addEventListener("click", () => openExchange(button.dataset.platformJump)));
  }

  function installExchange() {
    const view = document.querySelector("#activity-view");
    const heading = view?.querySelector(".section-heading");
    if (!view || !heading || view.querySelector(".culture-switch")) return;
    const switcher = document.createElement("div");
    switcher.className = "culture-switch";
    switcher.setAttribute("role", "tablist");
    switcher.innerHTML = `
      <button data-culture-mode="feed">Exchange</button>
      <button data-culture-mode="diary">Diary</button>
      <button data-culture-mode="lists">Lists</button>`;
    heading.insertAdjacentElement("afterend", switcher);

    const panel = document.createElement("div");
    panel.id = "platform-culture-panel";
    panel.className = "platform-culture-panel";
    switcher.insertAdjacentElement("afterend", panel);

    switcher.querySelectorAll("[data-culture-mode]").forEach(button => button.addEventListener("click", () => setExchangeMode(button.dataset.cultureMode)));
    setExchangeMode(exchangeMode);
  }

  function nativeExchangeElements() {
    const view = document.querySelector("#activity-view");
    return [
      view?.querySelector(".exchange-composer"),
      view?.querySelector(".memory-tabs"),
      view?.querySelector("#review-feed"),
      view?.querySelector("#following-feed"),
      view?.querySelector("#draft-feed"),
      view?.querySelector("#history-feed")
    ].filter(Boolean);
  }

  function setExchangeMode(mode) {
    exchangeMode = ["feed", "diary", "lists"].includes(mode) ? mode : "feed";
    save();
    document.querySelectorAll("[data-culture-mode]").forEach(button => button.classList.toggle("active", button.dataset.cultureMode === exchangeMode));
    nativeExchangeElements().forEach(element => element.classList.toggle("platform-native-hidden", exchangeMode !== "feed"));
    const panel = document.querySelector("#platform-culture-panel");
    if (!panel) return;
    panel.hidden = exchangeMode === "feed";
    if (exchangeMode === "diary") renderDiary(panel);
    if (exchangeMode === "lists") renderLists(panel);
  }

  function openExchange(mode = "feed") {
    callLegacy("switchView", "activity");
    setTimeout(() => setExchangeMode(mode), 40);
  }

  function renderDiary(panel) {
    const entries = [...culture.diary].sort((a, b) => b.date.localeCompare(a.date));
    panel.innerHTML = `
      <section class="culture-hero diary-hero"><p class="eyebrow">Listening diary</p><h3>Your life, indexed by what you heard.</h3><p>Log tracks, albums, concerts, and full Tether sessions. Reviews are optional; memory is the point.</p><button data-log-listen>Log a listen</button></section>
      <div class="culture-stats"><div><strong>${entries.length}</strong><span>logged</span></div><div><strong>${new Set(entries.map(item => item.artist)).size}</strong><span>artists</span></div><div><strong>6</strong><span>day streak</span></div></div>
      <div class="diary-timeline">${entries.map(entry => `
        <article><time>${esc(entry.date)}</time><span class="diary-cover">${esc(entry.type.slice(0, 1).toUpperCase())}</span><div><p class="eyebrow">${esc(entry.type)}</p><h4>${esc(entry.title)}</h4><strong>${esc(entry.artist)}</strong><p>${esc(entry.note)}</p></div><b>${Number(entry.score).toFixed(1)}</b></article>`).join("")}</div>`;
    panel.querySelector("[data-log-listen]")?.addEventListener("click", openDiaryEditor);
  }

  function openDiaryEditor() {
    openDialog(`
      <header><p class="eyebrow">Listening diary</p><h2>Log what you heard</h2><p>A rating can exist without a review. A memory can exist without either.</p></header>
      <label>Type<select name="type"><option>album</option><option>track</option><option>concert</option><option>playlist</option><option>Tether session</option></select></label>
      <label>Title<input name="title" required placeholder="Album, song, show, or session"></label>
      <label>Artist<input name="artist" required placeholder="Artist or people involved"></label>
      <div class="platform-field-row"><label>Rating<select name="score">${[5,4.5,4,3.5,3,2.5,2,1.5,1].map(value => `<option>${value}</option>`).join("")}</select></label><label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label></div>
      <label>Private note<textarea name="note" maxlength="280" placeholder="What stayed with you?"></textarea></label>
      <button type="button" class="platform-primary" data-save-diary>Save to diary</button>`, dialog => {
      dialog.querySelector("[data-save-diary]").addEventListener("click", () => {
        const form = dialog.querySelector("form");
        const data = new FormData(form);
        if (!String(data.get("title") || "").trim() || !String(data.get("artist") || "").trim()) return notify("Add a title and artist first.");
        culture.diary.unshift({ id: crypto.randomUUID(), type: data.get("type"), title: String(data.get("title")).trim(), artist: String(data.get("artist")).trim(), score: Number(data.get("score")), date: data.get("date"), note: String(data.get("note") || "").trim() });
        save();
        dialog.close();
        setExchangeMode("diary");
        installHomeRefresh();
        notify("Added to your listening diary.");
      });
    });
  }

  function renderLists(panel) {
    panel.innerHTML = `
      <section class="culture-hero lists-hero"><p class="eyebrow">Music lists</p><h3>Arguments disguised as collections.</h3><p>Rank, archive, recommend, and build a map through the music that matters to you.</p><button data-create-list>Create a list</button></section>
      <div class="list-grid">${culture.lists.map((list, index) => `
        <article class="music-list-card"><div class="list-covers"><i></i><i></i><i></i><span>${list.count}</span></div><p class="eyebrow">List ${String(index + 1).padStart(2,"0")}</p><h3>${esc(list.title)}</h3><p>${esc(list.description)}</p><footer><span>${list.count} entries</span><span>${list.saves} saves</span><button data-open-list="${esc(list.id)}">Open</button></footer></article>`).join("")}</div>`;
    panel.querySelector("[data-create-list]")?.addEventListener("click", openListEditor);
    panel.querySelectorAll("[data-open-list]").forEach(button => button.addEventListener("click", () => openList(button.dataset.openList)));
  }

  function openListEditor() {
    openDialog(`
      <header><p class="eyebrow">New list</p><h2>Make a musical argument</h2></header>
      <label>Title<input name="title" maxlength="80" placeholder="Albums that become architecture"></label>
      <label>Description<textarea name="description" maxlength="240" placeholder="What connects these records?"></textarea></label>
      <label>First entries<textarea name="entries" placeholder="One track or album per line"></textarea></label>
      <button type="button" class="platform-primary" data-save-list>Publish list</button>`, dialog => {
      dialog.querySelector("[data-save-list]").addEventListener("click", () => {
        const data = new FormData(dialog.querySelector("form"));
        const title = String(data.get("title") || "").trim();
        if (!title) return notify("Give the list a title first.");
        const entries = String(data.get("entries") || "").split("\n").filter(Boolean);
        culture.lists.unshift({ id: crypto.randomUUID(), title, description: String(data.get("description") || "").trim(), count: entries.length, saves: 0, entries });
        save();
        dialog.close();
        setExchangeMode("lists");
        notify("List published to The Exchange.");
      });
    });
  }

  function openList(id) {
    const list = culture.lists.find(item => item.id === id);
    if (!list) return;
    const entries = list.entries || ["Blonde — Frank Ocean", "Vespertine — Björk", "Titanic Rising — Weyes Blood", "Imaginal Disk — Magdalena Bay"];
    openDialog(`<header><p class="eyebrow">Music list</p><h2>${esc(list.title)}</h2><p>${esc(list.description)}</p></header><ol class="platform-list-detail">${entries.map(item => `<li>${esc(item)}</li>`).join("")}</ol><button type="button" class="platform-primary" data-save-copy>Save this list</button>`, dialog => {
      dialog.querySelector("[data-save-copy]").addEventListener("click", () => { dialog.close(); notify("List saved to your profile."); });
    });
  }

  function installHomeRefresh() {
    const section = document.querySelector(".platform-home-culture");
    if (section) section.remove();
    installHomeCulture();
  }

  function installWavelength() {
    const view = document.querySelector("#discover-view");
    const hero = view?.querySelector(".hero");
    if (!view || !hero || view.querySelector(".wavelength-world-switch")) return;
    const switcher = document.createElement("div");
    switcher.className = "wavelength-world-switch";
    switcher.innerHTML = `<button data-world="friends">Friends</button><button data-world="dating">Dating</button><button data-world="communities">Communities</button>`;
    hero.insertAdjacentElement("afterend", switcher);
    switcher.querySelectorAll("[data-world]").forEach(button => button.addEventListener("click", () => setWavelengthWorld(button.dataset.world)));

    const preferences = view.querySelector("[data-wavelength-settings]");
    preferences?.addEventListener("click", event => {
      const current = getState();
      if (current?.wavelengthProfile?.goal !== "dating") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openDatingEditor();
    }, true);

    const current = getState();
    setWavelengthWorld(current?.wavelengthProfile?.goal === "dating" ? "dating" : "friends", false);
    deckObserver = new MutationObserver(enhanceDatingCard);
    deckObserver.observe(document.querySelector("#swipe-deck"), { childList: true, subtree: true });
    enhanceDatingCard();
  }

  function setWavelengthWorld(world, rebuild = true) {
    const s = getState();
    const normalized = world === "dating" ? "dating" : "friends";
    document.querySelectorAll("[data-world]").forEach(button => button.classList.toggle("active", button.dataset.world === world));
    document.body.classList.toggle("dating-world", world === "dating");
    document.body.classList.toggle("communities-world", world === "communities");
    if (s?.wavelengthProfile) s.wavelengthProfile.goal = normalized;
    callLegacy("syncWavelengthHeader");
    if (rebuild) callLegacy("rebuildWavelengthQueue");
    renderDatingSummary(world);
    setTimeout(enhanceDatingCard, 20);
    if (world === "communities") notify("Communities use the friend graph for now; scene and venue groups are the next data layer.");
  }

  function renderDatingSummary(world) {
    document.querySelector(".dating-profile-summary")?.remove();
    if (world !== "dating") return;
    const deck = document.querySelector("#swipe-panel");
    const summary = document.createElement("article");
    summary.className = "dating-profile-summary";
    const complete = [culture.dating.identity, culture.dating.orientation, culture.dating.intent, culture.dating.promptAnswer].filter(Boolean).length;
    summary.innerHTML = `<div><p class="eyebrow">Your dating signal</p><h3>${complete}/4 identity layers complete</h3><p>${esc(culture.dating.intent)}</p></div><button data-edit-dating>Edit profile</button>`;
    deck?.insertBefore(summary, deck.firstChild);
    summary.querySelector("[data-edit-dating]")?.addEventListener("click", openDatingEditor);
  }

  function openDatingEditor() {
    const d = culture.dating;
    openDialog(`
      <header><p class="eyebrow">Wavelength Dating</p><h2>Build a profile around how you hear.</h2><p>Dating is opt-in and separate from your ordinary music profile. No field appears unless you choose to publish it.</p></header>
      <div class="platform-consent-row"><label><input name="enabled" type="checkbox" ${d.enabled ? "checked" : ""}> Enable Dating</label><label><input name="visible" type="checkbox" ${d.visible ? "checked" : ""}> Show me in Dating</label></div>
      <div class="platform-field-row"><label>Identity<input name="identity" value="${esc(d.identity)}" placeholder="Man, woman, nonbinary…"></label><label>Orientation<select name="orientation">${["Straight","Gay","Bisexual","Queer / open"].map(value => `<option ${d.orientation === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div>
      <label>What are you open to?<input name="intent" value="${esc(d.intent)}"></label>
      <div class="platform-field-row"><label>Relationship structure<select name="relationship">${["Monogamous","Non-monogamous","Open to either","Still figuring it out"].map(value => `<option ${d.relationship === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Distance<select name="distance">${[5,10,15,25,50].map(value => `<option value="${value}" ${Number(d.distance) === value ? "selected" : ""}>${value} miles</option>`).join("")}</select></label></div>
      <div class="platform-field-row three"><label>Age min<input name="ageMin" type="number" min="18" max="99" value="${d.ageMin}"></label><label>Age max<input name="ageMax" type="number" min="18" max="99" value="${d.ageMax}"></label><label>Height<input name="height" value="${esc(d.height)}"></label></div>
      <label>Body description<input name="body" value="${esc(d.body)}" placeholder="Optional, in your own language"></label>
      <div class="platform-consent-row"><label><input name="showHeight" type="checkbox" ${d.showHeight ? "checked" : ""}> Show height</label><label><input name="showBody" type="checkbox" ${d.showBody ? "checked" : ""}> Show body description</label></div>
      <div class="platform-divider"><span>Musical compatibility</span></div>
      <div class="platform-field-row"><label>Priority artist<input name="priorityArtist" value="${esc(d.priorityArtist)}"></label><label>Dealbreaker artist<input name="dealbreakerArtist" value="${esc(d.dealbreakerArtist)}"></label></div>
      <label>Priority album<input name="priorityAlbum" value="${esc(d.priorityAlbum)}"></label>
      <label>Your musical territory<input name="genres" value="${esc(d.genres)}"></label>
      <label>Concert life<input name="concerts" value="${esc(d.concerts)}"></label>
      <div class="platform-divider"><span>Profile prompt</span></div>
      <label>Prompt<input name="prompt" value="${esc(d.prompt)}"></label>
      <label>Your answer<textarea name="promptAnswer" maxlength="240">${esc(d.promptAnswer)}</textarea></label>
      <button type="button" class="platform-primary" data-save-dating>Save dating signal</button>`, dialog => {
      dialog.querySelector("[data-save-dating]").addEventListener("click", () => {
        const data = new FormData(dialog.querySelector("form"));
        const enabled = data.get("enabled") === "on";
        const visible = enabled && data.get("visible") === "on";
        culture.dating = {
          enabled, visible,
          identity: String(data.get("identity") || "").trim(),
          orientation: String(data.get("orientation") || "").trim(),
          intent: String(data.get("intent") || "").trim(),
          relationship: String(data.get("relationship") || "").trim(),
          distance: Number(data.get("distance")),
          ageMin: Number(data.get("ageMin")),
          ageMax: Number(data.get("ageMax")),
          height: String(data.get("height") || "").trim(),
          body: String(data.get("body") || "").trim(),
          showHeight: data.get("showHeight") === "on",
          showBody: data.get("showBody") === "on",
          priorityArtist: String(data.get("priorityArtist") || "").trim(),
          dealbreakerArtist: String(data.get("dealbreakerArtist") || "").trim(),
          priorityAlbum: String(data.get("priorityAlbum") || "").trim(),
          genres: String(data.get("genres") || "").trim(),
          concerts: String(data.get("concerts") || "").trim(),
          prompt: String(data.get("prompt") || "").trim(),
          promptAnswer: String(data.get("promptAnswer") || "").trim()
        };
        save();
        const s = getState();
        if (s?.wavelengthProfile) {
          s.wavelengthProfile.goal = "dating";
          s.wavelengthProfile.gender = culture.dating.identity;
          s.wavelengthProfile.orientation = culture.dating.orientation;
          s.wavelengthProfile.height = culture.dating.height;
          s.wavelengthProfile.avoidArtist = culture.dating.dealbreakerArtist;
          s.wavelengthProfile.priorityArtist = culture.dating.priorityArtist;
        }
        dialog.close();
        callLegacy("syncWavelengthHeader");
        callLegacy("rebuildWavelengthQueue");
        renderDatingSummary("dating");
        notify(visible ? "Your dating signal is live." : "Dating profile saved privately.");
      });
    });
  }

  function enhanceDatingCard() {
    const s = getState();
    if (s?.wavelengthProfile?.goal !== "dating") return;
    const card = document.querySelector("#swipe-deck [data-swipe-card]");
    if (!card || card.querySelector(".platform-dating-context")) return;
    const username = card.dataset.username;
    const profile = s?.profiles?.find(item => item.username === username);
    const match = card.querySelector(".swipe-match");
    if (match) {
      match.innerHTML = `Why this match <small>musical evidence</small> ?`;
      match.setAttribute("aria-label", "Explain the musical evidence for this recommendation");
    }
    const copy = card.querySelector(".swipe-copy");
    const context = document.createElement("div");
    context.className = "platform-dating-context";
    const artist = profile?.topArtists?.[0] || "their top artist";
    context.innerHTML = `
      <div class="dating-evidence"><span>Shared nights</span><span>${esc(artist)} territory</span><span>${culture.dating.distance} mi range</span></div>
      <blockquote><small>${esc(culture.dating.prompt)}</small><p>${esc(profile ? datingAnswerFor(profile) : "Ask me which record changed the way I hear people.")}</p></blockquote>
      <div class="dating-actions"><button data-leave-song>Leave a song</button><button data-answer-prompt>Answer their prompt</button></div>`;
    copy?.appendChild(context);
    context.querySelector("[data-leave-song]")?.addEventListener("click", event => { event.stopPropagation(); notify(`Song gesture left for ${profile?.name || "this profile"}.`); });
    context.querySelector("[data-answer-prompt]")?.addEventListener("click", event => { event.stopPropagation(); openPromptReply(profile); });
  }

  function datingAnswerFor(profile) {
    const artist = profile.topArtists?.[0] || "this artist";
    const options = [
      `The record I would insist we hear front-to-back is the one that made ${artist} click for me.`,
      `My most revealing music opinion is that a perfect bridge can redeem an entire song.`,
      `I trust people who let the outro finish—even when the train arrives.`,
      `Take me somewhere loud enough that we have to communicate by handing each other songs.`
    ];
    return options[Math.abs(profile.username.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % options.length];
  }

  function openPromptReply(profile) {
    openDialog(`<header><p class="eyebrow">Dating gesture</p><h2>Respond through music</h2><p>${esc(profile?.name || "This person")} will see the song and your answer together.</p></header><label>Song<input name="song" placeholder="Track — Artist"></label><label>Your response<textarea name="response" maxlength="240" placeholder="Say enough to open the door."></textarea></label><button type="button" class="platform-primary" data-send-reply>Send signal</button>`, dialog => {
      dialog.querySelector("[data-send-reply]").addEventListener("click", () => { dialog.close(); notify(`Signal sent to ${profile?.name || "their profile"}.`); });
    });
  }

  function observeProfiles() {
    const profile = document.querySelector("#profile-view");
    if (!profile || profileObserver) return;
    profileObserver = new MutationObserver(() => setTimeout(enhanceCurrentProfile, 0));
    profileObserver.observe(profile, { childList: true, subtree: true, attributes: true });
  }

  function enhanceCurrentProfile() {
    const view = document.querySelector("#profile-view");
    if (!view || !view.innerHTML.trim() || view.querySelector(".platform-profile-culture")) return;
    const s = getState();
    const profile = s?.selected;
    const target = view.querySelector(".profile-content, .profile-sheet, .profile-body") || view.firstElementChild;
    if (!target) return;
    const section = document.createElement("section");
    section.className = "platform-profile-culture";
    const artists = profile?.topArtists || ["Japanese Breakfast", "Radiohead", "Frank Ocean"];
    section.innerHTML = `
      <div class="platform-profile-heading"><p class="eyebrow">Music identity</p><h3>A person, not a compatibility score.</h3></div>
      <div class="profile-culture-grid"><article><strong>${artists.length}</strong><span>core artists</span><small>${esc(artists.slice(0,2).join(" · "))}</small></article><article><strong>18</strong><span>diary entries</span><small>6 this month</small></article><article><strong>7</strong><span>public reviews</span><small>4.6 average</small></article></div>
      <div class="profile-album-shelf"><p class="eyebrow">Four records that explain them</p><div>${culture.favorites.map((album, index) => `<button><i>${index + 1}</i><span>${esc(album)}</span></button>`).join("")}</div></div>
      <div class="profile-list-preview"><p class="eyebrow">Lists</p><h4>${esc(culture.lists[0].title)}</h4><p>${esc(culture.lists[0].description)}</p><button data-profile-open-list>Open list</button></div>`;
    target.appendChild(section);
    section.querySelector("[data-profile-open-list]")?.addEventListener("click", () => openList(culture.lists[0].id));
  }

  waitForLegacy();
})();
