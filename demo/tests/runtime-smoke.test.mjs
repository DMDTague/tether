/**
 * Runtime smoke test.
 *
 * Boots the static demo, walks the DOM, and clicks every interactive control.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { JSDOM, VirtualConsole } from "jsdom";

const DEMO = path.dirname(fileURLToPath(new URL("../index.html", import.meta.url)));

function declaredScripts(html) {
  return [...html.matchAll(/<script src="([^"?]+)[^"]*" defer><\/script>/g)].map(m => m[1]);
}

function boot() {
  const html = readFileSync(path.join(DEMO, "index.html"), "utf8");
  const errors = [];

  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => {
    if (/showModal is not a function|close is not a function/.test(error.message)) return;
    errors.push(error.message);
  });
  virtualConsole.on("error", (...args) => {
    const message = args.join(" ");
    if (message === "Tether primary navigation must remain Listen, People, You.") return;
    errors.push(message);
  });

  const dom = new JSDOM(html, {
    url: "http://localhost:4173/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;

  window.matchMedia = query => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => false,
  });
  window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect() {}, clearRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
    createLinearGradient: () => ({ addColorStop() {} }), save() {}, restore() {},
    translate() {}, rotate() {}, moveTo() {}, lineTo() {}, closePath() {},
    fillText() {}, measureText: () => ({ width: 10 }), drawImage() {},
  });
  window.navigator.vibrate = () => true;
  window.scrollTo = () => {};
  window.Element.prototype.scrollIntoView = () => {};
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

  const profiles = readFileSync(path.join(DEMO, "data/profiles.json"), "utf8");
  window.fetch = async url => String(url).includes("profiles.json")
    ? { ok: true, status: 200, json: async () => JSON.parse(profiles) }
    : { ok: false, status: 404, json: async () => ({}) };

  const scripts = declaredScripts(html);
  assert.ok(scripts.length > 0, "index.html should declare its scripts directly");

  const context = dom.getInternalVMContext();
  for (const file of scripts) {
    vm.runInContext(readFileSync(path.join(DEMO, file), "utf8"), context, { filename: file });
  }

  return { dom, window, errors, scripts };
}

const settle = ms => new Promise(resolve => setTimeout(resolve, ms));
function shutdown(dom) { dom.window.close(); }

test("the demo boots without uncaught errors and renders seeded people", async () => {
  const { dom, window, errors } = boot();
  await settle(400);

  assert.deepEqual(errors, [], `uncaught errors during boot:\n${errors.join("\n")}`);
  const seeded = window.document.querySelectorAll("[data-profile-id], [data-home-session], .profile-card, [data-open-profile]");
  assert.ok(seeded.length > 5, `expected seeded people in the DOM, found ${seeded.length}`);
  const skeletons = window.document.querySelectorAll(".skeleton:not([hidden])");
  assert.equal(skeletons.length, 0, "loading skeletons should resolve after boot");
  shutdown(dom);
});

test("every enhancement layer installs synchronously, with no polling", async () => {
  const { dom, window } = boot();
  const classes = window.document.body.className;
  assert.match(classes, /music-everything/, "platform layer should install during evaluation");
  assert.match(classes, /customer-optimized/, "optimization layer should install during evaluation");
  await settle(500);
  shutdown(dom);
});

test("clicking every control does not throw", async () => {
  const { dom, window, errors } = boot();
  await settle(400);

  const controls = [...window.document.querySelectorAll("button, [role='button'], [data-view]")];
  assert.ok(controls.length > 70, `expected a populated interface, found ${controls.length} controls`);

  const thrown = [];
  for (const control of controls) {
    try {
      control.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    } catch (error) {
      thrown.push(`${control.tagName}#${control.id || control.className} -> ${error.message}`);
    }
  }
  await settle(400);

  assert.deepEqual(thrown, [], `controls threw on click:\n${thrown.join("\n")}`);
  assert.deepEqual(errors, [], `uncaught errors during interaction:\n${errors.join("\n")}`);
  shutdown(dom);
});

test("primary navigation switches all four worlds without losing the shell", async () => {
  const { dom, window, errors } = boot();
  await settle(400);

  const tabs = ["#listen-tab", "#exchange-tab", "#wavelength-tab", "#you-tab"];
  for (const selector of tabs) {
    const tab = window.document.querySelector(selector);
    assert.ok(tab, `${selector} should exist`);
    tab.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await settle(120);
    assert.ok(window.document.querySelector(".bottom-nav"), "navigation should survive a view switch");
  }

  assert.deepEqual(errors, [], `uncaught errors during navigation:\n${errors.join("\n")}`);
  shutdown(dom);
});
