(() => {
  "use strict";

  const STORAGE_KEY = "tether:music-culture:v2";
  const defaults = {
    mode: "feed",
    diary: [
      { date: "2026-07-09", title: "Imaginal Disk", artist: "Magdalena Bay", score: 4.5, note: "Maximal, melodic, and built like a world." },
      { date: "2026-07-08", title: "Eusexua", artist: "FKA twigs", score: 5, note: "The dance floor as a spiritual practice." },
      { date: "2026-07-06", title: "Blonde", artist: "Frank Ocean", score: 5, note: "Still rearranges the room around it." },
    ],
    lists: [
      { title: "Philadelphia after midnight", description: "Records for empty platforms, wet pavement, and the last bus home.", count: 18 },
      { title: "Albums that become architecture", description: "Music that feels less written than inhabited.", count: 12 },
      { title: "The bridge is the whole point", description: "Songs whose emotional argument arrives halfway through.", count: 24 },
    ],
  };

  const culture = load();
  let currentMode = culture.mode || "feed";

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return stored ? { ...defaults, ...stored } : structuredClone(defaults);
    } catch (_) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save() {
    culture.mode = currentMode;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(culture)); } catch (_) {}
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    })[character]);
  }

  function callLegacy(name, ...args) {
    try {
      const candidate = globalThis[name] || eval(name);
      return typeof candidate === "function" ? candidate(...args) : undefined;
    } catch (_) {
      return undefined;
    }
  }

  function notify(message) {
    if (callLegacy("toast", message) !== undefined) return;
    const host = document.querySelector("#toast");
    if (!host) return;
    host.textContent = message;
    host.classList.add("show");
    setTimeout(() => host.classList.remove("show"), 2100);
  }

  function ensureDialog() {
    if (document.querySelector("#platform-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "platform-dialog";
    dialog.className = "platform-dialog";
    dialog.addEventListener("click", event => {
      if (event.target === dialog && typeof dialog.close === "function") dialog.close();
    });
    document.body.append(dialog);
  }

  function openDialog(markup, onReady) {
    const dialog = document.querySelector("#platform-dialog");
    if (!dialog) return;
    dialog.innerHTML = `<form method="dialog" class="platform-dialog-shell"><button class="platform-close" value="cancel" aria-label="Close">×</button>${markup}</form>`;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    onReady?.(dialog);
  }

  function installHomeCulture() {
    const anchor = document.querySelector("#trending-session-list");
    if (!anchor || document.querySelector(".platform-home-culture")) return;
    const section = document.createElement("section");
    section.className = "platform-home-culture";
    section.innerHTML = `
      <div class="home-section-head platform-section-head"><div><p class="eyebrow">Your music life</p><h3>Keep listening after the session ends</h3></div></div>
      <div class="platform-life-grid">
        <button data-platform-jump="diary"><span>${culture.diary.length}</span><strong>Diary entries</strong><small>Log what you heard</small></button>
        <button data-platform-jump="feed"><span>12</span><strong>Reviews</strong><small>Join Exchange</small></button>
        <button data-platform-jump="lists"><span>${culture.lists.length}</span><strong>Lists</strong><small>Curate your taste</small></button>
      </div>`;
    anchor.insertAdjacentElement("afterend", section);
    section.querySelectorAll("[data-platform-jump]").forEach(button => button.addEventListener("click", () => openExchange(button.dataset.platformJump)));
  }

  function installExchangeTools() {
    const view = document.querySelector("#activity-view");
    const heading = view?.querySelector(".section-heading");
    if (!view || !heading || view.querySelector(".culture-switch")) return;

    const switcher = document.createElement("div");
    switcher.className = "culture-switch";
    switcher.setAttribute("role", "tablist");
    switcher.setAttribute("aria-label", "Exchange tools");
    switcher.innerHTML = `
      <button data-culture-mode="feed">Exchange</button>
      <button data-culture-mode="diary">Diary</button>
      <button data-culture-mode="lists">Lists</button>`;
    heading.insertAdjacentElement("afterend", switcher);

    const panel = document.createElement("div");
    panel.id = "platform-culture-panel";
    panel.className = "platform-culture-panel";
    switcher.insertAdjacentElement("afterend", panel);

    switcher.querySelectorAll("[data-culture-mode]").forEach(button => button.addEventListener("click", () => setMode(button.dataset.cultureMode)));
    setMode(currentMode);
  }

  function nativeExchangeElements() {
    const view = document.querySelector("#activity-view");
    return [
      view?.querySelector(".exchange-composer"),
      view?.querySelector(".memory-tabs"),
      ...view?.querySelectorAll(".memory-panel") || [],
    ].filter(Boolean);
  }

  function setMode(mode) {
    currentMode = ["feed", "diary", "lists"].includes(mode) ? mode : "feed";
    save();
    document.querySelectorAll("[data-culture-mode]").forEach(button => button.classList.toggle("active", button.dataset.cultureMode === currentMode));
    nativeExchangeElements().forEach(element => element.classList.toggle("platform-native-hidden", currentMode !== "feed"));
    const panel = document.querySelector("#platform-culture-panel");
    if (!panel) return;
    panel.hidden = currentMode === "feed";
    if (currentMode === "diary") renderDiary(panel);
    if (currentMode === "lists") renderLists(panel);
  }

  function openExchange(mode = "feed") {
    callLegacy("switchView", "activity");
    setTimeout(() => setMode(mode), 40);
  }

  function renderDiary(panel) {
    panel.innerHTML = `<section class="culture-hero diary-hero"><p class="eyebrow">Listening diary</p><h3>Your life, indexed by what you heard.</h3><p>Private by default. Publish individual entries when they belong in Exchange.</p><button data-log-listen>Log a listen</button></section>
      <div class="diary-timeline">${culture.diary.map(entry => `<article><time>${escapeHtml(entry.date)}</time><div><h4>${escapeHtml(entry.title)}</h4><strong>${escapeHtml(entry.artist)}</strong><p>${escapeHtml(entry.note)}</p></div><b>${Number(entry.score).toFixed(1)}</b></article>`).join("")}</div>`;
    panel.querySelector("[data-log-listen]")?.addEventListener("click", openDiaryEditor);
  }

  function openDiaryEditor() {
    openDialog(`<header><p class="eyebrow">Listening diary</p><h2>Log what you heard</h2></header><label>Title<input name="title" required></label><label>Artist<input name="artist" required></label><label>Private note<textarea name="note" maxlength="280"></textarea></label><button type="button" class="platform-primary" data-save-diary>Save to diary</button>`, dialog => {
      dialog.querySelector("[data-save-diary]")?.addEventListener("click", () => {
        const data = new FormData(dialog.querySelector("form"));
        const title = String(data.get("title") || "").trim();
        const artist = String(data.get("artist") || "").trim();
        if (!title || !artist) return notify("Add a title and artist first.");
        culture.diary.unshift({ date: new Date().toISOString().slice(0, 10), title, artist, score: 5, note: String(data.get("note") || "").trim() });
        save();
        if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
        setMode("diary");
        notify("Added to your listening diary.");
      });
    });
  }

  function renderLists(panel) {
    panel.innerHTML = `<section class="culture-hero lists-hero"><p class="eyebrow">Music lists</p><h3>Arguments disguised as collections.</h3><p>Rank, archive, recommend, and build a map through the music that matters to you.</p></section><div class="list-grid">${culture.lists.map(list => `<article class="music-list-card"><p class="eyebrow">${list.count} entries</p><h3>${escapeHtml(list.title)}</h3><p>${escapeHtml(list.description)}</p><button data-save-platform-list>Save</button></article>`).join("")}</div>`;
    panel.querySelectorAll("[data-save-platform-list]").forEach(button => button.addEventListener("click", () => notify("List saved to your profile.")));
  }

  function install() {
    document.body.classList.add("music-everything");
    ensureDialog();
    installHomeCulture();
    installExchangeTools();
  }

  install();
})();
