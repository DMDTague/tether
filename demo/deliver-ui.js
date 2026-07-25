(() => {
  "use strict";

  const one = (selector, root = document) => root.querySelector(selector);
  const many = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STATUS = {
    connected: { label: "Backend-connected", detail: "Uses an API or authoritative session workflow." },
    seeded: { label: "Seeded simulation", detail: "Illustrative content supplied with the product demo." },
    local: { label: "Local-only demo", detail: "Changes only this browser tab; it is not saved to an account." },
    preview: { label: "Designed preview", detail: "Shows intended UX, but the complete customer workflow is not shipped." },
  };
  const DATING_PREVIEW_KEY = "tether.demo.dating-preview.v2";

  function tell(message) {
    if (typeof globalThis.toast === "function") globalThis.toast(message);
    else {
      const host = one("#toast");
      if (!host) return;
      host.textContent = message;
      host.classList.add("show");
      setTimeout(() => host.classList.remove("show"), 2200);
    }
  }

  function statusBadge(kind, extra = "") {
    const status = STATUS[kind];
    return `<span class="prototype-status prototype-status-${kind}" title="${status.detail}"><i></i>${status.label}${extra ? ` · ${extra}` : ""}</span>`;
  }

  function addStatus(host, kind, extra = "") {
    if (!host || one(":scope > .prototype-status", host)) return;
    host.insertAdjacentHTML("afterbegin", statusBadge(kind, extra));
  }

  function cover(title, artist) {
    if (typeof globalThis.coverArt === "function") return globalThis.coverArt(title, artist);
    return `<span class="truth-cover" aria-hidden="true">${title.slice(0, 1)}${artist.slice(0, 1)}</span>`;
  }

  function installEvidenceLegend() {
    const home = one("#home-view");
    if (!home || one(".evidence-legend", home)) return;
    const legend = document.createElement("section");
    legend.className = "evidence-legend";
    legend.setAttribute("aria-label", "Demo evidence key");
    legend.innerHTML = `<div><p class="eyebrow">What is real here?</p><h2>Evidence key</h2></div><div class="evidence-legend-items">${Object.keys(STATUS).map(kind => statusBadge(kind)).join("")}</div><p>Every surface is labeled. Seeded content and local interactions are never presented as account history, verified engagement, or algorithmic certainty.</p>`;
    home.insertBefore(legend, home.firstElementChild?.nextSibling || home.firstChild);
  }

  function makeStaticClaimsTruthful() {
    const accountState = one(".account-save-state");
    if (accountState) accountState.innerHTML = `<i></i> Seeded Exchange preview`;

    const completeness = one(".profile-completeness small");
    if (completeness) completeness.textContent = "Illustrative completeness preview · not read from an account API";

    const syncPill = one(".sync-pill span");
    if (syncPill) syncPill.textContent = "Mixed demo states";

    const datingTitle = one(".dating-readiness-card h3");
    const datingCopy = one(".dating-readiness-card h3 + p");
    const ring = one(".dating-readiness-card .readiness-ring");
    if (datingTitle) datingTitle.textContent = "Dating setup preview is local-only";
    if (datingCopy) datingCopy.textContent = "The form demonstrates intended controls. It does not create, verify, or publish a Dating profile.";
    if (ring) {
      ring.textContent = "Demo";
      ring.style.setProperty("--progress", "0");
    }
    const checklist = many(".dating-checklist li");
    if (checklist[0]) checklist[0].textContent = "Self-declared adult eligibility (not age verification)";
    checklist.forEach(item => item.classList.remove("done"));

    const identityCounts = {
      dating: "Local setup preview",
      diary: "Seeded entries",
      reviews: "Seeded reviews",
      lists: "Seeded lists",
      communities: "Seeded communities",
      saved: "Local-only examples",
    };
    many("[data-you-tool]").forEach(button => {
      const replacement = identityCounts[button.dataset.youTool];
      const small = one("small", button);
      if (replacement && small) small.textContent = replacement;
    });

    addStatus(one("#activity-view"), "seeded", "feed labels are illustrative");
    addStatus(one('[data-wavelength-panel="dating"]'), "local");
    addStatus(one('[data-wavelength-panel="communities"]'), "seeded");
    addStatus(one('[data-wavelength-panel="local"]'), "seeded");
    addStatus(one("#you-view"), "seeded", "identity dashboard");
  }

  function renderKnocks() {
    const host = one("#knock-invite-list");
    if (!host) return;
    const requests = [
      { initials: "ZK", name: "Zuri", detail: "Illustrative Knock", track: "Neon Weather · demo track", action: "Preview" },
      { initials: "RH", name: "Hiroshi", detail: "Illustrative invitation", track: "Imaginal Disk · demo track", action: "Preview" },
    ];
    host.innerHTML = requests.map((item, index) => `<article class="knock-card" data-demo-request="${index}">${statusBadge("seeded")}<span class="knock-avatar">${item.initials}</span><span class="knock-copy"><strong>${item.name}</strong><small>${item.detail}</small><em>${item.track}</em></span><span class="knock-actions"><button data-demo-request-later>Later</button><button class="accept" data-demo-request-open>${item.action}</button></span></article>`).join("");
  }

  function renderRecommendations() {
    const host = one("#recommendation-rail");
    if (!host) return;
    const recommendations = [
      {
        title: "Myth",
        artist: "Beach House",
        family: "Collaborative candidate preview",
        explanation: "Illustrates how a future recommender could explain similar-listener evidence. No live neighborhood model or recommendation-specific confidence is running in this page.",
      },
      {
        title: "A House in Nebraska",
        artist: "Ethel Cain",
        family: "Exploration candidate preview",
        explanation: "Illustrates deliberate exploration. The page does not claim this account has never heard the track or that other listeners completed it.",
      },
    ];
    host.innerHTML = recommendations.map((item, index) => `<article class="recommendation-card">${statusBadge("seeded", item.family)}<span class="recommendation-art">${cover(item.title, item.artist)}</span><div class="recommendation-copy"><h3>${item.title}</h3><small>${item.artist}</small><p>${item.explanation}</p><div class="provenance-row"><span>Candidate family shown</span><span>No confidence claim</span><span>No “never heard” claim</span></div></div><div class="recommendation-actions"><button data-demo-rec="play" data-index="${index}">Preview play</button><button data-demo-rec="save" data-index="${index}">Save locally</button><button data-demo-rec="tether" data-index="${index}">Preview Tether</button><button data-demo-rec="known" data-index="${index}">I know this</button><button data-demo-rec="why" data-index="${index}">Evidence note</button><button data-demo-rec="send" data-index="${index}">Preview send</button></div></article>`).join("");
  }

  function renderMemoryPreview() {
    const host = one("#resurfaced-memory-card");
    if (!host) return;
    host.innerHTML = `<article class="resurfaced-card">${statusBadge("preview")}<p class="eyebrow">Meaningful-session contract</p><h3>Anchor preview with Zuri</h3><p>This card is not observed account history. A real Anchor now requires five minutes of pair overlap, playback evidence, acceptable sync samples, a deliberate pair action, and no pair safety rejection.</p><small>No mileage, invented duration, or fabricated gesture is asserted.</small><div class="resurfaced-card-actions"><button data-demo-memory="contract">See contract</button><button data-demo-memory="preview">Open preview</button></div></article>`;
  }

  function exchangeCard(source, title, body, algorithm) {
    return `<article class="exchange-object-card">${statusBadge("seeded", algorithm)}<div class="exchange-object-head"><strong>${source}</strong><span>Illustrative object</span></div><h3>${title}</h3><p>${body}</p><div class="exchange-object-meta"><span>No verified-listen badge</span><span>No fabricated engagement</span></div><div class="exchange-action-bar"><button data-demo-exchange="listen">Preview listen</button><button data-demo-exchange="useful">Local feedback</button><button data-demo-exchange="reply">Preview reply</button><button data-demo-exchange="tether">Preview Tether</button></div></article>`;
  }

  function renderExchange() {
    const feeds = {
      local: [exchangeCard("Philadelphia scene", "What a real Local feed must prove", "A production Local feed needs city-level eligibility, blocks, mutes, moderation, and actual impression outcomes. This seeded card demonstrates the surface only.", "Local algorithm not connected")],
      rising: [exchangeCard("Emerging creator", "Rising without fake momentum", "A real Rising feed needs unique-account normalization, quality confidence, anti-brigading, creator exposure controls, and report penalties.", "Rising algorithm not connected")],
      new: [exchangeCard("Chronological preview", "Newest public objects", "This is a seeded example of strict chronological ordering. It does not claim that a post was just published.", "New-feed preview")],
    };
    Object.entries(feeds).forEach(([name, cards]) => {
      const host = one(`#${name}-feed`);
      if (host) host.innerHTML = cards.join("");
    });
    many("#review-feed > article, #following-feed > article").forEach(card => addStatus(card, "seeded"));
  }

  function renderCommunities() {
    const communityHost = one("#community-card-grid");
    if (communityHost) {
      const names = ["Philly indie shows", "Queer metalheads", "Album-order loyalists", "Night listeners"];
      communityHost.innerHTML = names.map(name => `<button class="community-card" data-demo-community>${statusBadge("seeded")}<b>${name}</b><small>Illustrative community identity. Membership and moderation are not connected in this page.</small><span>Open preview</span></button>`).join("");
    }
    const localHost = one("#local-scene-grid");
    if (localHost) {
      const scenes = ["Philadelphia indie", "Late-night R&B", "Punk and hardcore", "Electronic nights"];
      localHost.innerHTML = scenes.map(name => `<button class="local-scene-card" data-demo-scene>${statusBadge("seeded")}<b>${name}</b><small>City-level scene preview; no active-listener total or nearest-first ordering.</small><span>Open preview</span></button>`).join("");
    }
  }

  function switchWavelengthPanel(name) {
    many("[data-wavelength-hub]").forEach(button => {
      const active = button.dataset.wavelengthHub === name;
      button.classList.toggle("active", active);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(active));
      button.setAttribute("tabindex", active ? "0" : "-1");
    });
    many("[data-wavelength-panel]").forEach(panel => {
      const active = panel.dataset.wavelengthPanel === name;
      panel.classList.toggle("active", active);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-hidden", String(!active));
    });
  }

  function openLocalDatingPreview() {
    if (typeof globalThis.openFeatureModal !== "function") {
      tell("Local-only Dating preview; no account API was called.");
      return;
    }
    globalThis.openFeatureModal(`<div class="modal-head"><div>${statusBadge("local")}<p class="eyebrow">Dating setup concept</p><h3>Preview visibility and eligibility controls</h3></div><button class="icon-button" data-truth-close aria-label="Close Dating preview">×</button></div><p class="modal-copy">This form is illustrative. Date of birth is self-declared, media is not uploaded or moderated here, and filters are not promised to affect a live candidate pool.</p><div class="dating-form-grid"><label>Declared date of birth<input type="date" value="2004-07-07"></label><label>Intent<select><option>Long-term relationship</option><option>Dating</option><option>Friendship first</option></select></label><div class="visibility-row"><span>Height</span><select><option>Public</option><option>After match</option><option>Filter only</option><option>Do not use</option></select></div><div class="visibility-row"><span>Relationship structure</span><select><option>Public</option><option>After match</option><option>Filter only</option><option>Do not use</option></select></div><label class="safety-check"><input type="checkbox" data-truth-safety><span>I understand this is a local-only concept preview.</span></label></div><div class="onboarding-actions"><button class="btn" data-truth-close>Cancel</button><button class="btn primary" data-truth-save>Save in this tab</button></div>`);
    const modal = one("#feature-modal");
    many("[data-truth-close]", modal).forEach(button => button.addEventListener("click", () => globalThis.closeFeatureModal?.()));
    one("[data-truth-save]", modal)?.addEventListener("click", () => {
      if (!one("[data-truth-safety]", modal)?.checked) {
        tell("Confirm that this is a local-only preview.");
        return;
      }
      sessionStorage.setItem(DATING_PREVIEW_KEY, "complete");
      globalThis.closeFeatureModal?.();
      tell("Saved only in this browser tab. No Dating profile was created.");
    });
  }

  function installActions() {
    many("[data-wavelength-hub]").forEach(button => button.addEventListener("click", () => switchWavelengthPanel(button.dataset.wavelengthHub)));
    many("[data-start-dating-onboarding], [data-dating-mode-toggle]").forEach(button => button.addEventListener("click", openLocalDatingPreview));
    one("[data-preview-dating-profile]")?.addEventListener("click", () => tell("Designed profile-card preview; it is not a discoverable account profile."));
    many("[data-demo-request-open], [data-demo-request-later]").forEach(button => button.addEventListener("click", () => tell("Seeded request preview. No live Knock or invitation changed.")));
    many("[data-demo-rec]").forEach(button => button.addEventListener("click", () => tell(`${button.textContent.trim()}: local demonstration only.`)));
    many("[data-demo-memory]").forEach(button => button.addEventListener("click", () => tell("Designed Anchor preview. Real Anchors come only from the server finalizer.")));
    many("[data-demo-exchange]").forEach(button => button.addEventListener("click", () => tell("Seeded Exchange interaction; no account object or metric changed.")));
    many("[data-demo-community], [data-demo-scene]").forEach(button => button.addEventListener("click", () => tell("Seeded preview; no membership or local activity was queried.")));
    many(".privacy-matrix button").forEach(button => button.addEventListener("click", () => tell("Visibility control preview; no profile field was persisted.")));
  }

  function install() {
    if (document.body.classList.contains("truthful-demo-v2")) return;
    document.body.classList.add("truthful-demo-v2");
    installEvidenceLegend();
    makeStaticClaimsTruthful();
    renderKnocks();
    renderRecommendations();
    renderMemoryPreview();
    renderExchange();
    renderCommunities();
    switchWavelengthPanel("friends");
    installActions();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
