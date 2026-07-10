(() => {
  "use strict";

  const KEY = "tether:continuity:v1";
  const state = read();
  let observer;

  function read() {
    try {
      return {
        lastView: "home",
        lastCultureMode: "feed",
        exchangeDraft: "",
        diaryDraft: {},
        listDraft: {},
        datingDraft: {},
        ...(JSON.parse(localStorage.getItem(KEY) || "null") || {})
      };
    } catch (_) {
      return { lastView: "home", lastCultureMode: "feed", exchangeDraft: "", diaryDraft: {}, listDraft: {}, datingDraft: {} };
    }
  }

  function write() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function install(attempt = 0) {
    if (!document.body.classList.contains("customer-optimized")) {
      if (attempt < 100) setTimeout(() => install(attempt + 1), 80);
      return;
    }
    bindNavigation();
    restoreDynamicForms();
    addResumeCard();
    observer = new MutationObserver(() => {
      bindNavigation();
      restoreDynamicForms();
      addResumeCard();
      repairDatingFeedbackAction();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  function bindNavigation() {
    document.querySelectorAll(".bottom-nav [data-view]").forEach(button => {
      if (button.dataset.continuityBound) return;
      button.dataset.continuityBound = "true";
      button.addEventListener("click", () => {
        state.lastView = button.dataset.view;
        write();
        refreshResumeCard();
      });
    });
    document.querySelectorAll("[data-culture-mode]").forEach(button => {
      if (button.dataset.continuityBound) return;
      button.dataset.continuityBound = "true";
      button.addEventListener("click", () => {
        state.lastCultureMode = button.dataset.cultureMode;
        write();
        refreshResumeCard();
      });
    });
  }

  function restoreDynamicForms() {
    const exchange = document.querySelector("[data-draft-text]");
    if (exchange && !exchange.dataset.continuityBound) {
      exchange.dataset.continuityBound = "true";
      if (!exchange.value && state.exchangeDraft) {
        exchange.value = state.exchangeDraft;
        exchange.dispatchEvent(new Event("input", { bubbles: true }));
      }
      exchange.addEventListener("input", () => {
        state.exchangeDraft = exchange.value;
        write();
        refreshResumeCard();
      });
      document.querySelector("[data-submit-draft]")?.addEventListener("click", () => {
        setTimeout(() => {
          if (!exchange.value) {
            state.exchangeDraft = "";
            write();
            refreshResumeCard();
          }
        }, 50);
      });
    }

    const dialog = document.querySelector("#platform-dialog[open]");
    if (!dialog) return;
    const form = dialog.querySelector("form");
    if (!form || form.dataset.continuityBound) return;

    let bucket = null;
    if (dialog.querySelector("[data-save-diary]")) bucket = "diaryDraft";
    if (dialog.querySelector("[data-save-list]")) bucket = "listDraft";
    if (dialog.querySelector("[data-save-dating]")) bucket = "datingDraft";
    if (!bucket) return;

    form.dataset.continuityBound = "true";
    const saved = state[bucket] || {};
    [...form.elements].forEach(field => {
      if (!field.name || !(field.name in saved)) return;
      if (field.type === "checkbox") field.checked = Boolean(saved[field.name]);
      else field.value = saved[field.name];
    });

    form.addEventListener("input", () => {
      state[bucket] = serialize(form);
      write();
      refreshResumeCard();
    });
    form.addEventListener("change", () => {
      state[bucket] = serialize(form);
      write();
    });

    const saveButton = form.querySelector("[data-save-diary], [data-save-list], [data-save-dating]");
    saveButton?.addEventListener("click", () => {
      setTimeout(() => {
        if (!dialog.open) {
          state[bucket] = {};
          write();
          refreshResumeCard();
        }
      }, 80);
    });
  }

  function serialize(form) {
    const output = {};
    [...form.elements].forEach(field => {
      if (!field.name) return;
      output[field.name] = field.type === "checkbox" ? field.checked : field.value;
    });
    return output;
  }

  function hasDraft(value) {
    if (typeof value === "string") return Boolean(value.trim());
    return value && Object.values(value).some(item => typeof item === "boolean" ? item : String(item || "").trim());
  }

  function draftCount() {
    return [state.exchangeDraft, state.diaryDraft, state.listDraft, state.datingDraft].filter(hasDraft).length;
  }

  function addResumeCard() {
    const home = document.querySelector("#home-view");
    const welcome = home?.querySelector(".home-welcome");
    if (!home || !welcome || home.querySelector(".customer-resume-card")) return;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "customer-resume-card";
    card.addEventListener("click", resumeJourney);
    welcome.insertAdjacentElement("afterend", card);
    refreshResumeCard();
  }

  function refreshResumeCard() {
    const card = document.querySelector(".customer-resume-card");
    if (!card) return;
    const drafts = draftCount();
    const label = state.lastView === "activity"
      ? `Return to ${state.lastCultureMode === "feed" ? "The Exchange" : state.lastCultureMode}`
      : state.lastView === "discover"
        ? "Return to Wavelength"
        : state.lastView === "you"
          ? "Return to your music life"
          : state.lastView === "messages"
            ? "Return to messages"
            : "Continue where you left off";
    card.innerHTML = `<span><small>Continue</small><strong>${label}</strong>${drafts ? `<em>${drafts} unfinished ${drafts === 1 ? "draft" : "drafts"} preserved</em>` : `<em>Your place and choices are remembered</em>`}</span><b>›</b>`;
    card.hidden = state.lastView === "home" && drafts === 0;
  }

  function resumeJourney() {
    if (hasDraft(state.exchangeDraft)) {
      document.querySelector('.bottom-nav [data-view="activity"]')?.click();
      setTimeout(() => document.querySelector("[data-open-exchange-composer]")?.click(), 80);
      return;
    }
    if (hasDraft(state.diaryDraft)) return openCultureDraft("diary", "[data-log-listen]");
    if (hasDraft(state.listDraft)) return openCultureDraft("lists", "[data-create-list]");
    if (hasDraft(state.datingDraft)) {
      document.querySelector('.bottom-nav [data-view="discover"]')?.click();
      setTimeout(() => {
        document.querySelector('[data-world="dating"]')?.click();
        setTimeout(() => document.querySelector("[data-edit-dating]")?.click(), 70);
      }, 70);
      return;
    }
    document.querySelector(`.bottom-nav [data-view="${state.lastView}"]`)?.click();
    if (state.lastView === "activity") setTimeout(() => document.querySelector(`[data-culture-mode="${state.lastCultureMode}"]`)?.click(), 50);
  }

  function openCultureDraft(mode, actionSelector) {
    document.querySelector('.bottom-nav [data-view="activity"]')?.click();
    setTimeout(() => {
      document.querySelector(`[data-culture-mode="${mode}"]`)?.click();
      setTimeout(() => document.querySelector(actionSelector)?.click(), 60);
    }, 60);
  }

  function repairDatingFeedbackAction() {
    const button = document.querySelector(".customer-feedback-toast [data-tune-matches]");
    if (!button || button.dataset.repaired) return;
    const replacement = button.cloneNode(true);
    replacement.dataset.repaired = "true";
    button.replaceWith(replacement);
    replacement.addEventListener("click", () => {
      replacement.closest(".customer-feedback-toast")?.remove();
      const edit = document.querySelector("[data-edit-dating]");
      if (edit) edit.click();
      else document.querySelector("[data-wavelength-settings]")?.click();
    });
  }

  install();
})();
