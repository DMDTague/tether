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

function boot() {
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
  click(window, '[data-dating-tab="grid"]');
  assert.ok(window.document.querySelectorAll(".dating-grid-card").length >= 4);
  click(window, '[data-dating-tab="signals"]');
  assert.ok(window.document.querySelectorAll(".signal-card").length >= 2);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("claiming a profile updates the shared identity instead of parallel stores", () => {
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
  assert.equal(window.document.querySelector(".you-hero h1")?.textContent, "Maya Chen");
  assert.match(window.document.querySelector(".avatar-button img")?.src || "", /x_joseph_x\.svg/);
  const stored = JSON.parse(window.localStorage.getItem("tether.v2"));
  assert.equal(stored.account.displayName, "Maya Chen");
  assert.equal(stored.dating.enabled, true);
  assert.equal(window.localStorage.length, 1);
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
  assert.deepEqual(errors, []);
  dom.window.close();
});
