(() => {
  "use strict";

  const one = (selector, root = document) => root.querySelector(selector);
  const many = (selector, root = document) => [...root.querySelectorAll(selector)];

  function setText(selector, value, root = document) {
    const node = one(selector, root);
    if (node && node.textContent !== value) node.textContent = value;
  }

  function makeHeading(kicker, title, copy = "") {
    const heading = document.createElement("header");
    heading.className = "studio-section-heading";
    heading.innerHTML = `<p>${kicker}</p><h2>${title}</h2>${copy ? `<span>${copy}</span>` : ""}`;
    return heading;
  }

  function moveImportedTaste() {
    const card = one("[data-imported-card]");
    const topFive = one(".top-five-card");
    if (!card || !topFive || card.dataset.studioMoved) return;
    card.dataset.studioMoved = "true";
    card.classList.add("studio-connected-music");
    setText(".eyebrow", "Connected music", card);
    setText("h3", "Spotify shapes your Tether", card);
    setText("p", "Your imported library quietly improves people, music, and Dating recommendations.", card);
    topFive.insertAdjacentElement("afterend", card);
  }

  function curateListen() {
    const home = one("#home-view");
    if (!home || home.dataset.studioCurated) return;
    home.dataset.studioCurated = "true";

    setText(".listen-intro .eyebrow", "Live connection", home);
    setText("#home-title", "Listen together", home);
    setText(".available-now .eyebrow", "Your people", home);
    setText("#available-now-title", "Listening now", home);
    setText(".live-requests .eyebrow", "Needs you", home);
    setText("#live-requests-title", "Requests", home);
    setText(".continue-relationship .eyebrow", "Pick it back up", home);
    setText("#continue-relationship-title", "Continue together", home);

    const intro = one(".listen-intro", home);
    const hero = one("#listen-hero", home);
    const available = one(".available-now", home);
    const requests = one(".live-requests", home);
    const continuation = one(".continue-relationship", home);
    [intro, hero, available, requests, continuation].filter(Boolean).forEach(node => home.append(node));

    const recommendation = one(".recommendation-section", home);
    const memory = one(".memory-resurface", home);
    if ((recommendation || memory) && !one(".studio-later", home)) {
      const later = document.createElement("details");
      later.className = "studio-later";
      later.innerHTML = `<summary><span><b>For later</b><small>Recommendations and memories</small></span><i aria-hidden="true">+</i></summary><div class="studio-later-content"></div>`;
      const content = one(".studio-later-content", later);
      if (recommendation) content.append(recommendation);
      if (memory) content.append(memory);
      home.append(later);
    }

    const local = one(".local-now", home);
    const exchange = one("#activity-view");
    if (local && exchange) {
      local.classList.add("studio-exchange-local");
      setText(".eyebrow", "Live around you", local);
      setText("#trending-title", "Philadelphia is listening", local);
      one("[data-view='activity']", local)?.remove();
      exchange.append(local);
    }
  }

  function curateExchange() {
    const view = one("#activity-view");
    if (!view || view.dataset.studioCurated) return;
    view.dataset.studioCurated = "true";
    const heading = one(".exchange-heading", view);
    if (heading) {
      heading.innerHTML = `<div><p class="eyebrow">Music in conversation</p><h2 id="activity-title">Exchange</h2><span class="studio-heading-copy">Reviews, lists, and the ideas music leaves behind.</span></div>`;
    }
    const composer = one(".exchange-composer", view);
    if (composer) {
      setText("strong", "Start with the music", composer);
      setText("small", "Write a review, log a listen, or make a list", composer);
    }
  }

  function reflectPeopleMode(mode) {
    const view = one("#messages-view");
    if (!view) return;
    const dating = mode === "dating";
    view.classList.toggle("studio-dating-active", dating);
    setText("#messages-title", dating ? "Dating" : "People", view);
    setText(
      ".section-promise",
      dating ? "Meet through taste. Start with a song." : "Friends, conversations, communities, and scenes.",
      view
    );
    setText(".wavelength-heading .eyebrow", dating ? "Private by design" : "Your music network", view);
  }

  function curatePeople() {
    const view = one("#messages-view");
    if (!view || view.dataset.studioCurated) return;
    view.dataset.studioCurated = "true";
    setText("#messages-title", "People", view);
    setText(".wavelength-heading .eyebrow", "Your music network", view);
    setText(".section-promise", "Friends, conversations, communities, and scenes.", view);
    setText("#wavelength-tab small", "People");
    one("#wavelength-tab")?.setAttribute("aria-label", "People and Dating");
    const inbox = one(".people-inbox", view);
    if (inbox) {
      inbox.open = false;
      setText("summary b", "Messages", inbox);
      setText("summary small", "3 unread conversations", inbox);
    }

    const peopleMode = one("[data-wavelength-mode='people']", view);
    peopleMode?.addEventListener("click", () => reflectPeopleMode("people"));
    many("[data-wavelength-hub]", view).forEach(button => {
      button.addEventListener("click", () => reflectPeopleMode(button.dataset.wavelengthHub === "dating" ? "dating" : "people"));
    });
  }

  function createYouGroup(title, copy, tools, open = false) {
    const details = document.createElement("details");
    details.className = "studio-you-group";
    details.open = open;
    details.innerHTML = `<summary><span><b>${title}</b><small>${copy}</small></span><i aria-hidden="true">+</i></summary><div class="studio-you-tools"></div>`;
    const target = one(".studio-you-tools", details);
    tools.filter(Boolean).forEach(tool => target.append(tool));
    return details;
  }

  function curateYou() {
    const view = one("#you-view");
    const dashboard = one(".identity-dashboard", view);
    const grid = one(".identity-action-grid", dashboard);
    if (!view || !dashboard || !grid || dashboard.dataset.studioCurated) return;
    dashboard.dataset.studioCurated = "true";

    const buttons = Object.fromEntries(many("[data-you-tool]", grid).map(button => [button.dataset.youTool, button]));
    const groups = document.createElement("div");
    groups.className = "studio-you-groups";
    groups.append(
      createYouGroup("Profiles", "How other people meet you", [buttons.public, buttons.dating], true),
      createYouGroup("Music library", "Diary, reviews, lists, recommendations, and saves", [buttons.diary, buttons.reviews, buttons.lists, buttons.recommendations, buttons.saved]),
      createYouGroup("Relationships", "Matches and communities", [buttons.matches, buttons.communities]),
      createYouGroup("Account", "Providers, privacy, export, and deletion", [buttons.account])
    );

    one(".profile-collection-head", dashboard)?.replaceWith(makeHeading("Your spaces", "Everything has a home", "Open only what you need."));
    grid.replaceWith(groups);
  }

  function simplifyTruthLabels() {
    many(".prototype-status").forEach(status => {
      status.classList.add("studio-truth-marker");
      status.setAttribute("aria-label", status.getAttribute("title") || status.textContent.trim());
    });
    setText(".demo-badge", "Demo");
  }

  function syncDynamicSurfaces() {
    moveImportedTaste();
    simplifyTruthLabels();
    const active = one("[data-wavelength-panel='dating'].active") ? "dating" : "people";
    reflectPeopleMode(active);
  }

  function install() {
    if (document.body.classList.contains("tether-studio-v1")) return;
    document.body.classList.add("tether-studio-v1");
    curateListen();
    curateExchange();
    curatePeople();
    curateYou();
    syncDynamicSurfaces();

    const observer = new MutationObserver(() => syncDynamicSurfaces());
    observer.observe(one(".phone") || document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
