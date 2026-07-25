(() => {
  "use strict";

  const one = (selector, root = document) => root.querySelector(selector);
  const many = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STATUS = {
    connected: ["Backend-connected", "Uses an API or authoritative session workflow."],
    seeded: ["Seeded simulation", "Illustrative content supplied with the product demo."],
    local: ["Local-only demo", "Changes only this browser tab; it is not saved to an account."],
    preview: ["Designed preview", "Shows intended UX, but the complete customer workflow is not shipped."],
  };

  function loadStyles() {
    if (one('link[data-truth-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "truth.css?v=2";
    link.dataset.truthStyles = "true";
    document.head.append(link);
  }

  function tell(message) {
    if (typeof globalThis.toast === "function") return globalThis.toast(message);
    const host = one("#toast");
    if (!host) return;
    host.textContent = message;
    host.classList.add("show");
    setTimeout(() => host.classList.remove("show"), 2200);
  }

  function badge(kind, extra = "") {
    const [label, detail] = STATUS[kind];
    return `<span class="prototype-status prototype-status-${kind}" title="${detail}"><i></i>${label}${extra ? ` · ${extra}` : ""}</span>`;
  }

  function addBadge(host, kind, extra = "") {
    if (host && !one(":scope > .prototype-status", host)) host.insertAdjacentHTML("afterbegin", badge(kind, extra));
  }

  function cover(title, artist) {
    return typeof globalThis.coverArt === "function"
      ? globalThis.coverArt(title, artist)
      : `<span class="truth-cover" aria-hidden="true">${title[0]}${artist[0]}</span>`;
  }

  function installLegend() {
    const home = one("#home-view");
    if (!home || one(".evidence-legend", home)) return;
    const legend = document.createElement("section");
    legend.className = "evidence-legend";
    legend.setAttribute("aria-label", "Demo evidence key");
    legend.innerHTML = `<div><p class="eyebrow">What is real here?</p><h2>Evidence key</h2></div><div class="evidence-legend-items">${Object.keys(STATUS).map(kind => badge(kind)).join("")}</div><p>Every surface is labeled. Seeded content and local interactions are never presented as account history, verified engagement, or algorithmic certainty.</p>`;
    home.insertBefore(legend, home.firstElementChild?.nextSibling || home.firstChild);
  }

  function rewriteStaticClaims() {
    const account = one(".account-save-state");
    if (account) account.innerHTML = "<i></i> Seeded Exchange preview";
    const completeness = one(".profile-completeness small");
    if (completeness) completeness.textContent = "Illustrative completeness preview · not read from an account API";
    const sync = one(".sync-pill span");
    if (sync) sync.textContent = "Mixed demo states";

    const dating = one(".dating-readiness-card");
    if (dating) {
      one("h3", dating).textContent = "Dating setup preview is local-only";
      const copy = one("h3 + p", dating);
      if (copy) copy.textContent = "This form demonstrates intended controls. It does not create, verify, or publish a Dating profile.";
      const ring = one(".readiness-ring", dating);
      if (ring) { ring.textContent = "Demo"; ring.style.setProperty("--progress", "0"); }
      const items = many(".dating-checklist li", dating);
      if (items[0]) items[0].textContent = "Self-declared adult eligibility (not age verification)";
      items.forEach(item => item.classList.remove("done"));
    }

    const labels = { dating: "Local setup preview", diary: "Seeded entries", reviews: "Seeded reviews", lists: "Seeded lists", communities: "Seeded communities", saved: "Local-only examples" };
    many("[data-you-tool]").forEach(button => {
      const small = one("small", button);
      if (small && labels[button.dataset.youTool]) small.textContent = labels[button.dataset.youTool];
    });

    addBadge(one("#activity-view"), "seeded", "feed algorithms are illustrative");
    addBadge(one('[data-wavelength-panel="dating"]'), "local");
    addBadge(one('[data-wavelength-panel="communities"]'), "seeded");
    addBadge(one('[data-wavelength-panel="local"]'), "seeded");
    addBadge(one("#you-view"), "seeded", "identity dashboard");
  }

  function renderListenProofs() {
    const knocks = one("#knock-invite-list");
    if (knocks) knocks.innerHTML = [
      ["ZK", "Zuri", "Illustrative Knock", "Neon Weather · demo track"],
      ["RH", "Hiroshi", "Illustrative invitation", "Imaginal Disk · demo track"],
    ].map(([initials, name, detail, track]) => `<article class="knock-card">${badge("seeded")}<span class="knock-avatar">${initials}</span><span class="knock-copy"><strong>${name}</strong><small>${detail}</small><em>${track}</em></span><span class="knock-actions"><button data-seeded-action>Later</button><button class="accept" data-seeded-action>Preview</button></span></article>`).join("");

    const recommendations = one("#recommendation-rail");
    if (recommendations) recommendations.innerHTML = [
      ["Myth", "Beach House", "Collaborative candidate preview", "Illustrates a future similar-listener explanation. No live neighborhood model or recommendation-specific confidence runs here."],
      ["A House in Nebraska", "Ethel Cain", "Exploration candidate preview", "Illustrates deliberate exploration without claiming the account has never heard the track."],
    ].map(([title, artist, family, explanation]) => `<article class="recommendation-card">${badge("seeded", family)}<span class="recommendation-art">${cover(title, artist)}</span><div class="recommendation-copy"><h3>${title}</h3><small>${artist}</small><p>${explanation}</p><div class="provenance-row"><span>Candidate family shown</span><span>No confidence claim</span><span>No “never heard” claim</span></div></div><div class="recommendation-actions"><button data-local-action>Preview play</button><button data-local-action>Save locally</button><button data-local-action>Preview Tether</button><button data-local-action>I know this</button><button data-local-action>Evidence note</button><button data-local-action>Preview send</button></div></article>`).join("");

    const memory = one("#resurfaced-memory-card");
    if (memory) memory.innerHTML = `<article class="resurfaced-card">${badge("preview")}<p class="eyebrow">Meaningful-session contract</p><h3>Anchor preview with Zuri</h3><p>This is not observed account history. A real Anchor requires five minutes of pair overlap, playback evidence, acceptable sync samples, a deliberate pair action, and no pair safety rejection.</p><small>No mileage, duration, or gesture is fabricated.</small><div class="resurfaced-card-actions"><button data-preview-action>See contract</button><button data-preview-action>Open preview</button></div></article>`;
  }

  function exchangeCard(source, title, body, algorithm) {
    return `<article class="exchange-object-card">${badge("seeded", algorithm)}<div class="exchange-object-head"><strong>${source}</strong><span>Illustrative object</span></div><h3>${title}</h3><p>${body}</p><div class="exchange-object-meta"><span>No verified-listen badge</span><span>No fabricated engagement</span></div><div class="exchange-action-bar"><button data-seeded-action>Preview listen</button><button data-local-action>Local feedback</button><button data-preview-action>Preview reply</button><button data-preview-action>Preview Tether</button></div></article>`;
  }

  function renderExchangeAndScenes() {
    const cards = {
      local: exchangeCard("Philadelphia scene", "What a real Local feed must prove", "A production Local feed needs city-level eligibility, blocks, mutes, moderation, and real impression outcomes.", "Local algorithm not connected"),
      rising: exchangeCard("Emerging creator", "Rising without fake momentum", "A real Rising feed needs unique-account normalization, anti-brigading, quality confidence, and creator exposure controls.", "Rising algorithm not connected"),
      new: exchangeCard("Chronological preview", "Newest public objects", "A seeded example of strict chronological ordering; it does not claim a post was just published.", "New-feed preview"),
    };
    Object.entries(cards).forEach(([name, card]) => { const host = one(`#${name}-feed`); if (host) host.innerHTML = card; });
    many("#review-feed > article, #following-feed > article").forEach(card => addBadge(card, "seeded"));

    const communities = one("#community-card-grid");
    if (communities) communities.innerHTML = ["Philly indie shows", "Queer metalheads", "Album-order loyalists", "Night listeners"].map(name => `<button class="community-card" data-seeded-action>${badge("seeded")}<b>${name}</b><small>Illustrative identity. Membership and moderation are not connected on this page.</small><span>Open preview</span></button>`).join("");
    const scenes = one("#local-scene-grid");
    if (scenes) scenes.innerHTML = ["Philadelphia indie", "Late-night R&B", "Punk and hardcore", "Electronic nights"].map(name => `<button class="local-scene-card" data-seeded-action>${badge("seeded")}<b>${name}</b><small>City-level preview; no active-listener total or nearest-first ordering.</small><span>Open preview</span></button>`).join("");
  }

  function switchWavelength(name) {
    many("[data-wavelength-hub]").forEach(button => {
      const active = button.dataset.wavelengthHub === name;
      button.classList.toggle("active", active);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    many("[data-wavelength-panel]").forEach(panel => {
      const active = panel.dataset.wavelengthPanel === name;
      panel.classList.toggle("active", active);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-hidden", String(!active));
    });
  }

  function openDatingPreview() {
    if (typeof globalThis.openFeatureModal !== "function") return tell("Local-only Dating preview; no account API was called.");
    globalThis.openFeatureModal(`<div class="modal-head"><div>${badge("local")}<p class="eyebrow">Dating setup concept</p><h3>Preview visibility and eligibility controls</h3></div><button class="icon-button" data-truth-close aria-label="Close Dating preview">×</button></div><p class="modal-copy">Date of birth is self-declared, media is not uploaded or moderated here, and the controls do not affect a live candidate pool.</p><div class="dating-form-grid"><label>Declared date of birth<input type="date" value="2004-07-07"></label><label>Intent<select><option>Long-term relationship</option><option>Dating</option><option>Friendship first</option></select></label><div class="visibility-row"><span>Height</span><select><option>Public</option><option>After match</option><option>Filter only</option><option>Do not use</option></select></div><label class="safety-check"><input type="checkbox" data-truth-safety><span>I understand this is a local-only concept preview.</span></label></div><div class="onboarding-actions"><button class="btn" data-truth-close>Cancel</button><button class="btn primary" data-truth-save>Save in this tab</button></div>`);
    const modal = one("#feature-modal");
    many("[data-truth-close]", modal).forEach(button => button.addEventListener("click", () => globalThis.closeFeatureModal?.()));
    one("[data-truth-save]", modal)?.addEventListener("click", () => {
      if (!one("[data-truth-safety]", modal)?.checked) return tell("Confirm that this is a local-only preview.");
      sessionStorage.setItem("tether.demo.dating-preview.v2", "complete");
      globalThis.closeFeatureModal?.();
      tell("Saved only in this tab. No Dating profile was created.");
    });
  }

  function installActions() {
    many("[data-wavelength-hub]").forEach(button => button.addEventListener("click", () => switchWavelength(button.dataset.wavelengthHub)));
    many("[data-start-dating-onboarding], [data-dating-mode-toggle]").forEach(button => button.addEventListener("click", openDatingPreview));
    one("[data-preview-dating-profile]")?.addEventListener("click", () => tell("Designed profile-card preview; it is not discoverable."));
    many("[data-seeded-action]").forEach(button => button.addEventListener("click", () => tell("Seeded simulation; no live object or metric changed.")));
    many("[data-local-action]").forEach(button => button.addEventListener("click", () => tell("Local-only demonstration; not saved to an account.")));
    many("[data-preview-action]").forEach(button => button.addEventListener("click", () => tell("Designed preview; the complete workflow is not shipped.")));
    many(".privacy-matrix button").forEach(button => button.addEventListener("click", () => tell("Visibility preview; no profile field was persisted.")));
  }

  function install() {
    if (document.body.classList.contains("truthful-demo-v2")) return;
    loadStyles();
    document.body.classList.add("truthful-demo-v2");
    installLegend();
    rewriteStaticClaims();
    renderListenProofs();
    renderExchangeAndScenes();
    switchWavelength("friends");
    installActions();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
