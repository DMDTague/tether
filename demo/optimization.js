(() => {
  "use strict";

  const CUSTOMER_STATE_KEY = "tether:customer-journeys:v1";
  const journey = loadJourney();
  let observer;

  function loadJourney() {
    try {
      return { lastView: "home", lastExchangeMode: "feed", savedDraft: "", ...(JSON.parse(localStorage.getItem(CUSTOMER_STATE_KEY) || "null") || {}) };
    } catch (_) {
      return { lastView: "home", lastExchangeMode: "feed", savedDraft: "" };
    }
  }

  function persist() {
    localStorage.setItem(CUSTOMER_STATE_KEY, JSON.stringify(journey));
  }

  function ready(attempt = 0) {
    if (document.body.classList.contains("music-everything") && document.querySelector(".bottom-nav")) return install();
    if (attempt < 100) setTimeout(() => ready(attempt + 1), 80);
  }

  function install() {
    if (document.body.classList.contains("customer-optimized")) return;
    document.body.classList.add("customer-optimized");
    installQuickCreate();
    installJourneyContinuity();
    optimizeExchange();
    optimizeDating();
    optimizeProfiles();
    optimizeTetherStart();
    observer = new MutationObserver(() => {
      optimizeExchange();
      optimizeDating();
      optimizeProfiles();
      optimizeTetherStart();
    });
    observer.observe(document.querySelector(".phone"), { childList: true, subtree: true, attributes: true });
  }

  function installQuickCreate() {
    const topbar = document.querySelector(".topbar");
    if (!topbar || topbar.querySelector(".customer-create-button")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "customer-create-button";
    button.setAttribute("aria-label", "Create a review, diary entry, or list");
    button.innerHTML = `<span>＋</span>`;
    button.addEventListener("click", openCreateMenu);
    topbar.insertBefore(button, topbar.lastElementChild);
  }

  function openSecondaryView(view) {
    if (typeof globalThis.switchView === "function") globalThis.switchView(view);
  }

  function openCreateMenu() {
    const dialog = document.querySelector("#platform-dialog");
    if (!dialog) return;
    dialog.innerHTML = `<form method="dialog" class="platform-dialog-shell customer-create-sheet">
      <button class="platform-close" value="cancel" aria-label="Close">×</button>
      <header><p class="eyebrow">Create</p><h2>What do you want to preserve?</h2><p>Start from the outcome—not from a maze of posting options.</p></header>
      <button type="button" data-customer-create="review"><b>Write a review</b><span>Make a public argument about something you heard.</span></button>
      <button type="button" data-customer-create="diary"><b>Log a listen</b><span>Save a private memory, with or without a rating.</span></button>
      <button type="button" data-customer-create="list"><b>Build a list</b><span>Turn taste into a collection people can save and follow.</span></button>
      <button type="button" data-customer-create="tether"><b>Open your listening</b><span>Start the product's central experience immediately.</span></button>
    </form>`;
    dialog.showModal();
    dialog.querySelectorAll("[data-customer-create]").forEach(button => button.addEventListener("click", () => {
      const action = button.dataset.customerCreate;
      dialog.close();
      if (action === "review") {
        openSecondaryView("activity");
        setTimeout(() => document.querySelector("[data-open-exchange-composer]")?.click(), 80);
      }
      if (action === "diary") openCultureAction("diary", "[data-log-listen]");
      if (action === "list") openCultureAction("lists", "[data-create-list]");
      if (action === "tether") document.querySelector("[data-start-own-session]")?.click();
    }));
  }

  function openCultureAction(mode, selector) {
    openSecondaryView("activity");
    setTimeout(() => {
      document.querySelector(`[data-culture-mode="${mode}"]`)?.click();
      setTimeout(() => document.querySelector(selector)?.click(), 50);
    }, 60);
  }

  function installJourneyContinuity() {
    document.querySelectorAll(".bottom-nav [data-view]").forEach(button => {
      if (button.dataset.customerTracked) return;
      button.dataset.customerTracked = "true";
      button.addEventListener("click", () => {
        journey.lastView = button.dataset.view;
        persist();
      });
    });
    document.querySelectorAll("[data-culture-mode]").forEach(button => {
      if (button.dataset.customerTracked) return;
      button.dataset.customerTracked = "true";
      button.addEventListener("click", () => {
        journey.lastExchangeMode = button.dataset.cultureMode;
        persist();
      });
    });
  }

  function optimizeExchange() {
    const view = document.querySelector("#activity-view");
    if (!view) return;
    if (!view.querySelector(".customer-exchange-actions")) {
      const switcher = view.querySelector(".culture-switch");
      const actions = document.createElement("div");
      actions.className = "customer-exchange-actions";
      actions.innerHTML = `<button data-customer-review><i>✦</i><span><b>Review</b><small>Publish criticism</small></span></button><button data-customer-diary><i>◷</i><span><b>Diary</b><small>Log privately</small></span></button><button data-customer-list><i>≡</i><span><b>List</b><small>Curate publicly</small></span></button>`;
      switcher?.insertAdjacentElement("afterend", actions);
      actions.querySelector("[data-customer-review]")?.addEventListener("click", () => document.querySelector("[data-open-exchange-composer]")?.click());
      actions.querySelector("[data-customer-diary]")?.addEventListener("click", () => openCultureAction("diary", "[data-log-listen]"));
      actions.querySelector("[data-customer-list]")?.addEventListener("click", () => openCultureAction("lists", "[data-create-list]"));
    }

    view.querySelectorAll(".review-card").forEach(card => {
      if (card.querySelector(".customer-review-next")) return;
      const footer = card.querySelector(".review-actions");
      if (!footer) return;
      const next = document.createElement("button");
      next.type = "button";
      next.className = "customer-review-next";
      next.textContent = "Add to diary";
      next.addEventListener("click", event => {
        event.stopPropagation();
        openCultureAction("diary", "[data-log-listen]");
      });
      footer.appendChild(next);
    });

    view.querySelectorAll(".diary-timeline article").forEach(entry => {
      if (entry.querySelector(".customer-diary-actions")) return;
      const actions = document.createElement("div");
      actions.className = "customer-diary-actions";
      actions.innerHTML = `<button data-turn-review>Review</button><button data-add-list>Add to list</button><button data-tether-entry>Tether</button>`;
      entry.appendChild(actions);
      actions.querySelector("[data-turn-review]")?.addEventListener("click", () => {
        document.querySelector('[data-culture-mode="feed"]')?.click();
        setTimeout(() => document.querySelector("[data-open-exchange-composer]")?.click(), 60);
      });
      actions.querySelector("[data-add-list]")?.addEventListener("click", () => openCultureAction("lists", "[data-create-list]"));
      actions.querySelector("[data-tether-entry]")?.addEventListener("click", () => document.querySelector("[data-start-own-session]")?.click());
    });

    view.querySelectorAll(".music-list-card").forEach(card => {
      if (card.querySelector(".customer-list-actions")) return;
      const footer = card.querySelector("footer");
      if (!footer) return;
      const actions = document.createElement("span");
      actions.className = "customer-list-actions";
      actions.innerHTML = `<button data-play-list>Play</button><button data-tether-list>Tether</button>`;
      footer.insertBefore(actions, footer.lastElementChild);
      actions.querySelector("[data-play-list]")?.addEventListener("click", event => { event.stopPropagation(); document.querySelector("[data-service-picker]")?.click(); });
      actions.querySelector("[data-tether-list]")?.addEventListener("click", event => { event.stopPropagation(); document.querySelector("[data-start-own-session]")?.click(); });
    });
  }

  function optimizeDating() {
    // Evidence and actions are rendered by the core card without a ranking overlay.
  }

  function optimizeProfiles() {
    // Profiles now own a small native Join / Knock / Message action set.
  }

  function optimizeTetherStart() {
    const modal = document.querySelector("#feature-modal");
    if (!modal || !modal.innerHTML.includes("Open your listening") || modal.querySelector(".customer-tether-promise")) return;
    const promise = document.createElement("aside");
    promise.className = "customer-tether-promise";
    promise.innerHTML = `<strong>Ten-second Tether</strong><span>Choose a track now. Privacy, provider, and invitation details remain editable after the Stage opens.</span>`;
    const copy = modal.querySelector(".modal-copy");
    copy?.insertAdjacentElement("afterend", promise);
  }

  ready();
})();
