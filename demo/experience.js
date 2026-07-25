(() => {
  "use strict";

  const one = (selector, root = document) => root.querySelector(selector);
  const many = (selector, root = document) => [...root.querySelectorAll(selector)];
  const PEOPLE_PANELS = new Set(["friends", "communities", "local", "search"]);
  let lastPeoplePanel = "friends";

  function tell(message) {
    if (typeof globalThis.toast === "function") return globalThis.toast(message);
    const host = one("#toast");
    if (!host) return;
    host.textContent = message;
    host.classList.add("show");
    setTimeout(() => host.classList.remove("show"), 2300);
  }

  function closeFeatureModal() {
    if (typeof globalThis.closeFeatureModal === "function") globalThis.closeFeatureModal();
    else one("#feature-modal")?.classList.remove("open");
  }

  function openTrustGuide() {
    if (typeof globalThis.openFeatureModal !== "function") {
      return tell("Demo content is labeled by how it behaves and where it is saved.");
    }
    globalThis.openFeatureModal(`<div class="experience-trust-guide">
      <div class="modal-head">
        <div><p class="eyebrow">A demo that respects you</p><h3>Know what every interaction means.</h3></div>
        <button class="icon-button" data-experience-close aria-label="Close demo guide">×</button>
      </div>
      <p class="modal-copy">Tether keeps product truth available without making implementation language compete with the experience.</p>
      <div class="experience-trust-list">
        <article><i class="connected"></i><div><b>Live workflow</b><p>Uses an API or authoritative session workflow.</p></div></article>
        <article><i class="seeded"></i><div><b>Demo content</b><p>Illustrative people, music, and activity supplied with this demo.</p></div></article>
        <article><i class="local"></i><div><b>This device</b><p>The interaction changes only this browser and is not saved to an account.</p></div></article>
        <article><i class="preview"></i><div><b>Preview</b><p>The customer experience is designed here, but its complete production workflow is not shipped.</p></div></article>
      </div>
      <section class="experience-customer-promise">
        <p class="eyebrow">The customer promise</p>
        <h4>Useful immediately. Honest always. Easy to reverse.</h4>
        <p>Core agency, filters, privacy, safety, and profile understanding are never treated as luxuries.</p>
      </section>
    </div>`);
    one("[data-experience-close]", one("#feature-modal"))?.addEventListener("click", closeFeatureModal);
  }

  function reflectWavelengthMode(panelName) {
    const dating = panelName === "dating";
    const messages = one("#messages-view");
    const peopleMode = one("[data-wavelength-mode='people']");
    const datingMode = one("[data-wavelength-hub='dating']");
    const peopleTabs = one(".wavelength-people-tabs");

    messages?.classList.toggle("dating-experience-active", dating);
    peopleMode?.classList.toggle("active", !dating);
    peopleMode?.setAttribute("aria-selected", String(!dating));
    peopleMode && (peopleMode.tabIndex = dating ? -1 : 0);
    datingMode?.classList.toggle("active", dating);
    datingMode?.setAttribute("aria-selected", String(dating));
    datingMode && (datingMode.tabIndex = dating ? 0 : -1);
    peopleTabs?.setAttribute("aria-hidden", String(dating));

    if (PEOPLE_PANELS.has(panelName)) lastPeoplePanel = panelName;
  }

  function activatePeople() {
    const target = one(`[data-wavelength-hub="${lastPeoplePanel}"]`)
      || one('[data-wavelength-hub="friends"]');
    target?.click();
    reflectWavelengthMode(target?.dataset.wavelengthHub || "friends");
  }

  function installWavelengthModes() {
    const peopleMode = one("[data-wavelength-mode='people']");
    if (peopleMode && !peopleMode.dataset.experienceBound) {
      peopleMode.dataset.experienceBound = "true";
      peopleMode.addEventListener("click", activatePeople);
    }

    many("[data-wavelength-hub]").forEach(button => {
      if (button.dataset.experienceBound) return;
      button.dataset.experienceBound = "true";
      button.addEventListener("click", () => reflectWavelengthMode(button.dataset.wavelengthHub));
    });

    const active = one("[data-wavelength-panel].active")?.dataset.wavelengthPanel || "friends";
    reflectWavelengthMode(active);
  }

  function installTrustEntry() {
    many("[data-sync-explainer]").forEach(button => {
      if (button.dataset.experienceBound) return;
      button.dataset.experienceBound = "true";
      button.addEventListener("click", openTrustGuide);
    });
    one(".evidence-legend")?.remove();
  }

  function improveCustomerWayfinding() {
    const datingTile = one('[data-you-tool="dating"]');
    const datingMeta = one("small", datingTile);
    if (datingMeta) datingMeta.textContent = "Visible · 2 new Signals";
    datingTile?.setAttribute("aria-label", "Open your Dating profile and 2 new Signals");

    const listenTitle = one("#home-title");
    if (listenTitle) listenTitle.setAttribute("data-promise", "Hear it together");
    const exchangeTitle = one("#activity-title");
    if (exchangeTitle) exchangeTitle.setAttribute("data-promise", "Say what the music meant");
    const youTitle = one("#you-title");
    if (youTitle) youTitle.setAttribute("data-promise", "Everything that sounds like you");
  }

  function openDating() {
    if (typeof globalThis.switchView === "function") globalThis.switchView("messages");
    else one('#wavelength-tab')?.click();
    one('[data-wavelength-hub="dating"]')?.click();
    reflectWavelengthMode("dating");
    one("#messages-view")?.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function install() {
    if (document.body.classList.contains("customer-experience-v1")) return;
    document.body.classList.add("customer-experience-v1");
    installTrustEntry();
    installWavelengthModes();
    improveCustomerWayfinding();
  }

  globalThis.TetherExperience = { openDating, openTrustGuide };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
