import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { JSDOM, VirtualConsole } from "jsdom";

const DEMO = path.dirname(fileURLToPath(new URL("../index.html", import.meta.url)));
const source = file => readFileSync(path.join(DEMO, file), "utf8");
const html = source("index.html");
const script = source("v15.js");
const css = source("tether.css");

function boot(savedState = null) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error.message));
  virtualConsole.on("error", (...args) => errors.push(args.join(" ")));
  const dom = new JSDOM(html, {
    url: "http://localhost:4173/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
  window.scrollTo = () => {};
  window.Element.prototype.scrollTo = () => {};
  window.navigator.vibrate = () => true;
  if (savedState) window.localStorage.setItem("tether.v2", JSON.stringify(savedState));
  vm.runInContext(script, dom.getInternalVMContext(), { filename: "v15.js" });
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return { dom, window, errors };
}

function click(window, selector) {
  const element = window.document.querySelector(selector);
  assert.ok(element, `${selector} should exist`);
  element.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  return element;
}

const settle = ms => new Promise(resolve => setTimeout(resolve, ms));

test("the shipped app has one authored design and behavior layer", () => {
  const cssFiles = readdirSync(DEMO).filter(file => file.endsWith(".css"));
  const jsFiles = readdirSync(DEMO).filter(file => file.endsWith(".js"));
  assert.deepEqual(cssFiles, ["tether.css"]);
  assert.deepEqual(jsFiles, ["v15.js"]);
  assert.equal((css.match(/:root\s*\{/g) || []).length, 1);
  assert.ok((css.match(/!important/g) || []).length <= 5);
  assert.equal((script.match(/MutationObserver/g) || []).length, 0);
  assert.equal((script.match(/"tether[^"]*"/g) || []).length, 1);
  assert.equal((css.match(/font-size:\s*(9|10|11)px/g) || []).length, 0);
  assert.equal((css.match(/Georgia/g) || []).length, 0);
  assert.doesNotMatch(html + script, /Behavioral Taste Graph|Separate opt-in ritual|prototype-status/);
});

test("violet brand identity is consistent across chrome and the Tether action", () => {
  const mark = source("brand/tether-mark.svg");
  assert.match(mark, /#8B7CFF/);
  assert.match(mark, /#5646D6/);
  assert.match(html, /brand\/tether-mark\.svg/);
  assert.match(html, /class="brand-lockup"/);
  assert.match(html, /class="tether-fab"/);
  assert.match(css, /--tether:#8b7cff/);
  assert.match(css, /--rose:#ff6b9e/);
});

test("the app boots into the live value and all four worlds remain navigable", () => {
  const { dom, window, errors } = boot();
  assert.equal(window.document.querySelector("h1")?.textContent, "Be there in the song.");
  assert.ok(window.document.querySelectorAll(".on-air-card").length >= 3);
  for (const [selector, panel] of [
    ["#exchange-tab", "#exchange-view"],
    ["#people-tab", "#people-view"],
    ["#you-tab", "#you-view"],
    ["#listen-tab", "#listen-view"],
  ]) {
    click(window, selector);
    assert.equal(window.document.querySelector(panel)?.hidden, false);
    assert.ok(window.document.querySelector(".bottom-nav"));
  }
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("You is an identity page and public profiles have one continuous action model", () => {
  const { dom, window, errors } = boot();
  click(window, "#you-tab");
  assert.ok(window.document.querySelector(".you-hero"));
  assert.ok(window.document.querySelector(".artist-shelf"));
  assert.ok(window.document.querySelector(".record-shelf"));
  assert.ok(window.document.querySelector(".latest-expression"));
  assert.ok(window.document.querySelector(".memory-timeline"));
  assert.equal(window.document.querySelectorAll(".identity-action-grid").length, 0);

  click(window, "#people-tab");
  click(window, '[data-profile="zuri"]');
  assert.ok(window.document.querySelector(".public-hero"));
  assert.ok(window.document.querySelector(".live-moment"));
  assert.ok(window.document.querySelector(".evidence-block"));
  assert.equal(window.document.querySelectorAll(".sticky-actions").length, 1);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("Dating is one candidate-first world with deck, grid, signals, and no automatic opt-in", () => {
  const { dom, window, errors } = boot();
  click(window, "#people-tab");
  click(window, '[data-mode="dating"]');
  assert.ok(window.document.querySelector(".dating-card"));
  assert.equal(window.document.querySelectorAll(".dating-card").length, 1);
  assert.equal(JSON.parse(window.localStorage.getItem("tether.v2")).dating.enabled, false);
  click(window, ".dating-card");
  assert.ok(window.document.querySelector(".profile-overlay .public-hero"));
  assert.ok(window.document.querySelector(".profile-overlay .stat-sheet"));
  assert.equal(window.document.querySelectorAll(".profile-overlay .sticky-actions").length, 1);
  click(window, '.profile-overlay [data-action="close"]');
  click(window, '[data-dating-tab="grid"]');
  assert.ok(window.document.querySelectorAll(".dating-grid-card").length >= 4);
  click(window, '[data-dating-tab="signals"]');
  assert.ok(window.document.querySelectorAll(".signal-card").length >= 2);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("claiming a profile updates shared identity and routes Dating through its own opt-in", () => {
  const { dom, window, errors } = boot();
  click(window, ".avatar-button");
  const name = window.document.querySelector('[name="displayName"]');
  name.value = "Maya Chen";
  click(window, "[data-setup-next]");
  const city = window.document.querySelector('[name="city"]');
  city.value = "Philadelphia";
  click(window, "[data-setup-next]");
  click(window, '[data-setup-photo="avatars/x_joseph_x.svg"]');
  click(window, "[data-setup-next]");
  click(window, '[data-setup-intent="both"]');
  click(window, "[data-setup-next]");
  click(window, "[data-setup-next]");
  assert.match(window.document.querySelector(".avatar-button img")?.src || "", /x_joseph_x\.svg/);
  const stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  assert.equal(stored.account.displayName, "Maya Chen");
  assert.equal(stored.dating.enabled, false);
  assert.ok(window.document.querySelector(".dating-studio"));
  assert.match(window.document.querySelector(".dating-studio h2")?.textContent || "", /consent/i);
  assert.equal(window.localStorage.length, 1);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("the Dating deck consumes choices, reaches an end state, and undoes the actual last decision", () => {
  const { dom, window, errors } = boot({
    account: { birthDate: "1995-04-12" },
    dating: { enabled: true, discoverable: true, passed: [], liked: [], history: [] },
    ui: { view: "people", peopleMode: "dating" },
  });
  let choices = 0;
  while (window.document.querySelector("[data-drag-card]") && choices < 10) {
    click(window, '[data-date-action="pass"]');
    choices += 1;
  }
  assert.ok(choices >= 4);
  assert.ok(window.document.querySelector(".dating-empty"));
  let stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  assert.equal(stored.dating.passed.length, choices);
  click(window, '[data-date-action="undo"]');
  assert.ok(window.document.querySelector("[data-drag-card]"));
  stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  assert.equal(stored.dating.passed.length, choices - 1);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("dragging a Dating card past the threshold commits the same Like behavior as the button", async () => {
  const { dom, window, errors } = boot({
    account: { birthDate: "1994-02-10" },
    dating: { enabled: true, discoverable: true, passed: [], liked: [], history: [] },
    ui: { view: "people", peopleMode: "dating" },
  });
  await settle(30);
  const card = window.document.querySelector("[data-drag-card]");
  card.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 100 }));
  card.dispatchEvent(new window.MouseEvent("pointermove", { bubbles: true, clientX: 110, clientY: 100 }));
  card.dispatchEvent(new window.MouseEvent("pointerup", { bubbles: true, clientX: 110, clientY: 100 }));
  await settle(240);
  const stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  assert.ok(stored.dating.liked.includes("raj"));
  assert.ok(stored.dating.history.some(item => item.id === "raj" && item.action === "like"));
  assert.ok((script.match(/pointerdown/g) || []).length >= 2);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("mutual interest earns a full match moment instead of a toast-only dead end", async () => {
  const { dom, window, errors } = boot({
    account: { birthDate: "1994-02-10" },
    dating: { enabled: true, discoverable: true, passed: [], liked: [], history: [] },
    ui: { view: "people", peopleMode: "dating" },
  });
  click(window, '[data-date-action="pass"]');
  click(window, '[data-date-action="like"]');
  await settle(140);
  assert.ok(window.document.querySelector(".match-moment"));
  assert.match(window.document.querySelector(".match-moment h2")?.textContent || "", /Zuri/);
  const stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  assert.ok(stored.dating.matches.includes("zuri"));
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("an under-18 birth date cannot enable Dating", () => {
  const { dom, window, errors } = boot();
  click(window, "#people-tab");
  click(window, '[data-mode="dating"]');
  click(window, '[data-action="dating-setup"]');
  const birthDate = window.document.querySelector('[name="datingBirthDate"]');
  const under18 = new Date();
  under18.setFullYear(under18.getFullYear() - 16);
  birthDate.value = under18.toISOString().slice(0, 10);
  click(window, "[data-dating-setup-next]");
  assert.match(window.document.querySelector(".dating-studio h2")?.textContent || "", /consent/i);
  assert.equal(JSON.parse(window.localStorage.getItem("tether.v2")).dating.enabled, false);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("modal focus enters, Escape closes, and focus returns to the invoker", async () => {
  const { dom, window, errors } = boot();
  const about = window.document.querySelector('[data-action="about"]');
  about.focus();
  click(window, '[data-action="about"]');
  await settle(30);
  assert.ok(window.document.querySelector("#overlay-root")?.contains(window.document.activeElement));
  window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(window.document.querySelector("#overlay-root")?.children.length, 0);
  assert.equal(window.document.activeElement, about);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("Pulse is a deliberate shared-stage ritual with visible recipient feedback", async () => {
  const { dom, window, errors } = boot();
  click(window, '[data-join="raj"]');
  const pulse = window.document.querySelector("[data-pulse]");
  pulse.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  await settle(1550);
  pulse.dispatchEvent(new window.Event("pointerup", { bubbles: true }));
  assert.equal(window.document.querySelector("[data-pulse-note]")?.textContent, "Raj felt your Pulse");
  assert.ok(window.document.querySelector(".stage")?.classList.contains("pulse-fired"));
  click(window, '[data-action="close-stage"]');
  await settle(150);
  assert.ok(window.document.querySelector(".memory-recap"));
  const stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  assert.equal(stored.memories.length, 4);
  assert.equal(stored.memories[0].personId, "raj");
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("Exchange publishing, rating, discussion, and saving all write through one culture state", () => {
  const { dom, window, errors } = boot();
  click(window, "#exchange-tab");
  click(window, ".composer");
  click(window, '[data-create-kind="review"]');
  window.document.querySelector('[name="reviewText"]').value = "The quiet arrangement leaves the feeling completely exposed.";
  click(window, "[data-submit-review]");
  assert.match(window.document.querySelector(".exchange-feed .review-body")?.textContent || "", /quiet arrangement/);
  let stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  const id = stored.culture.posts[0].id;

  click(window, `[data-rate="${id}"]`);
  click(window, `[data-rating-review="${id}"][data-rating-value="6.0"]`);
  click(window, `[data-thread="${id}"]`);
  const reply = window.document.querySelector(`[data-thread-form="${id}"] input`);
  reply.value = "Exactly—the space is doing half the writing.";
  reply.form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  click(window, '[data-action="close"]');
  click(window, `[data-save="${id}"]`);
  stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  assert.equal(stored.culture.ratings[id], "6.0");
  assert.equal(stored.culture.replies[id].length, 1);
  assert.ok(stored.culture.saved.includes(id));
  assert.deepEqual(errors, []);
  dom.window.close();
});
