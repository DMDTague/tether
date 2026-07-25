import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const DEMO = path.dirname(fileURLToPath(new URL("../index.html", import.meta.url)));
const source = name => readFileSync(path.join(DEMO, name), "utf8");

function boot() {
  const dom = new JSDOM(`<main class="phone"><section id="home-view"></section><section id="you-view"><div class="you-card deliver-you-card"><div class="avatar self-avatar"><b class="avatar-fallback">JR</b><img></div><h2 id="you-title">John</h2><p class="handle"></p><p class="bio"></p><div class="identity-chips"></div></div><div class="top-five-card"><h3>Top 5</h3><div id="profile-top-five"></div></div></section></main>`, {
    url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true
  });
  const { window } = dom;
  window.structuredClone = global.structuredClone;
  window.switchView = () => {};
  vm.runInContext(source("onboarding.js"), dom.getInternalVMContext(), { filename: "onboarding.js" });
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return dom;
}

test("a fresh install is gated behind account setup", () => {
  const dom = boot();
  assert.ok(dom.window.document.body.classList.contains("tether-onboarding-active"));
  assert.match(dom.window.document.querySelector(".install-gate").textContent, /Create my account/);
  assert.equal(dom.window.localStorage.getItem("tether.install.v1") !== null, true);
  dom.window.close();
});

test("the simulated Spotify import is candid and based on supplied music", () => {
  const js = source("onboarding.js");
  assert.match(js, /No Spotify account is contacted/);
  assert.match(js, /173/);
  for (const artist of ["Tyler, The Creator", "Jeff Buckley", "My Chemical Romance", "Radiohead", "Mac DeMarco"]) {
    assert.match(js, new RegExp(artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(js, /Wavelength discovery, and Dating/);
});

test("completion replaces the fictional account identity across the app", () => {
  const dom = boot();
  dom.window.TetherOnboarding.completeDemo();
  assert.equal(dom.window.document.querySelector("#you-title").textContent, "Dylan Tague");
  assert.match(dom.window.document.querySelector(".handle").textContent, /@dylantague/);
  assert.equal(dom.window.document.querySelectorAll("#profile-top-five .profile-top-five-item").length, 5);
  assert.ok(dom.window.document.querySelector("[data-imported-card]"));
  assert.equal(dom.window.document.querySelector(".install-gate").hidden, true);
  dom.window.close();
});

test("the installation can be reset without storing a password", () => {
  const js = source("onboarding.js");
  assert.doesNotMatch(js, /state\.password|password\s*:/);
  const dom = boot();
  dom.window.TetherOnboarding.completeDemo();
  dom.window.TetherOnboarding.restart();
  const saved = JSON.parse(dom.window.localStorage.getItem("tether.install.v1"));
  assert.equal(saved.complete, false);
  assert.equal(saved.step, 0);
  assert.ok(dom.window.document.body.classList.contains("tether-onboarding-active"));
  dom.window.close();
});
