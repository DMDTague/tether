import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const ui = readFileSync(new URL("../deliver-ui.js", import.meta.url), "utf8");
const truth = readFileSync(new URL("../truth.css", import.meta.url), "utf8");

test("the audit's central product worlds are first-class surfaces", () => {
  assert.match(index, /id="exchange-tab"/);
  assert.match(index, /id="wavelength-tab"/);
  assert.match(index, /Knocks & invitations/);
  assert.match(index, /From your musical neighborhood/);
  assert.match(index, /Communities and stickers/);
  assert.match(index, /Your music life/);
});

test("discovery uses broad location bands and makes demo evidence explicit", () => {
  const radar = index.match(/<div id="radar-panel"[\s\S]*?<div id="swipe-panel"/)?.[0] || "";
  assert.match(radar, />Nearby</);
  assert.match(radar, />In your city</);
  assert.match(radar, />Region</);
  assert.doesNotMatch(radar, />\s*\d+(?:\.\d+)?\s*(?:mi|miles)/i);
  assert.match(ui, /Seeded simulation/);
  assert.match(ui, /Local-only demo/);
  assert.match(ui, /Designed preview/);
  assert.match(ui, /No confidence claim/);
  assert.match(truth, /prototype-status-seeded/);
});

test("Dating is an explicit local-only preview, not fake account state", () => {
  assert.match(index, /Separate opt-in ritual/);
  assert.match(index, /Two profile photos/);
  assert.match(index, /Messaging opens only after mutual interest/);
  assert.match(ui, /function openDatingPreview/);
  assert.match(ui, /Self-declared adult eligibility \(not age verification\)/);
  assert.match(ui, /sessionStorage\.setItem/);
  assert.match(ui, /No Dating profile was created/);
  assert.doesNotMatch(ui, /Dating profile ready|Filters applied reciprocally|Saved to account/);
});

test("Exchange names feed modes but labels unconnected algorithms", () => {
  for (const label of ["For you", "Following", "Local", "Rising", "New"]) assert.match(index, new RegExp(`>${label}<`));
  for (const action of ["Preview listen", "Local feedback", "Preview reply", "Preview Tether"]) assert.match(ui, new RegExp(`>${action}<`));
  assert.match(ui, /Local algorithm not connected/);
  assert.match(ui, /Rising algorithm not connected/);
  assert.doesNotMatch(ui, /verified listen/i);
});
