import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const ui = readFileSync(new URL("../deliver-ui.js", import.meta.url), "utf8");

test("the audit's central product worlds are first-class surfaces", () => {
  assert.match(index, /id="exchange-tab"/);
  assert.match(index, /id="wavelength-tab"/);
  assert.match(index, /Knocks & invitations/);
  assert.match(index, /From your musical neighborhood/);
  assert.match(index, /Communities and stickers/);
  assert.match(index, /Your music life/);
});

test("discovery uses broad location bands rather than exact miles", () => {
  const radar = index.match(/<div id="radar-panel"[\s\S]*?<div id="swipe-panel"/)?.[0] || "";
  assert.match(radar, />Nearby</);
  assert.match(radar, />In your city</);
  assert.match(radar, />Region</);
  assert.doesNotMatch(radar, />\s*\d+(?:\.\d+)?\s*(?:mi|miles)/i);
  assert.match(ui, /sanitizeDistanceLanguage/);
});

test("Dating requires onboarding and mutual interest", () => {
  assert.match(index, /Separate opt-in ritual/);
  assert.match(index, /Two profile photos/);
  assert.match(index, /Messaging opens only after mutual interest/);
  assert.match(ui, /DATING_READY_KEY/);
  assert.match(ui, /signal_sent/);
  assert.doesNotMatch(ui, /immediately adds the person as a connection/i);
});

test("Exchange exposes the audit feed modes and persistent actions", () => {
  for (const label of ["For you", "Following", "Local", "Rising", "New"]) assert.match(index, new RegExp(`>${label}<`));
  for (const action of ["Listen", "Useful", "Reply", "Tether"]) assert.match(ui, new RegExp(`>${action}<`));
});
