import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../v14.js", import.meta.url), "utf8");
const platform = readFileSync(new URL("../platform.js", import.meta.url), "utf8");
const optimization = readFileSync(new URL("../optimization.js", import.meta.url), "utf8");
const deliver = readFileSync(new URL("../deliver-ui.js", import.meta.url), "utf8");

test("Wavelength starts with friends and exposes the complete relationship world", () => {
  assert.match(index, /<details class="people-inbox" open>/);
  assert.match(index, /Friends available now/);
  assert.match(index, /Friends of friends/);
  for (const section of ["friends", "dating", "communities", "local", "search"]) {
    assert.match(index, new RegExp(`data-wavelength-hub="${section}"`));
  }
  assert.match(app, /data-people-join=/);
  assert.match(app, /handlePrimaryAction\(profile\)/);
  assert.match(app, /function connectionEvidence\(profile\)/);
});

test("Dating Mode is explicit and honestly local-only in the browser demo", () => {
  assert.match(index, /data-dating-mode-toggle aria-pressed="false"/);
  assert.match(index, /Separate opt-in ritual/);
  assert.match(index, /Two profile photos/);
  assert.match(deliver, /function openDatingPreview/);
  assert.match(deliver, /self-declared/i);
  assert.match(deliver, /local-only concept preview/i);
  assert.match(deliver, /sessionStorage\.setItem/);
  assert.doesNotMatch(deliver, /DATING_READY_KEY|localStorage\.setItem|Dating profile ready/);
  assert.doesNotMatch(platform, /Dealbreaker artist|name="height"|name="ageMin"|identity layers complete/);
});

test("synthetic match percentages remain removed from discovery and profiles", () => {
  assert.doesNotMatch(app, /function compatibility\(|compatibility\(profile\)|percent music compatibility|% vibe match|% match|shared\.score|% shared frequency/);
  assert.match(app, /evidence-chips wavelength-evidence/);
  assert.match(app, /class="profile-evidence-inline"/);
  assert.doesNotMatch(deliver, /\d+% confidence|78%|confidence label/i);
});

test("other-user profiles keep direct actions without fabricated cultural evidence", () => {
  const profileStart = app.indexOf("function openProfile(username)");
  const profileEnd = app.indexOf("function closeProfile()", profileStart);
  const profileView = app.slice(profileStart, profileEnd);
  assert.match(profileView, /Who|simplified-profile-hero/);
  assert.match(profileView, /Why connect\?/);
  assert.match(profileView, /data-session/);
  assert.match(profileView, /data-message/);
  assert.doesNotMatch(deliver, /Musical interior|Cultural contribution|Relational context/);
  assert.doesNotMatch(deliver, /Finished two albums|Saved three tracks|One mutual person|Pinned review|shared public diary/i);
  assert.doesNotMatch(profileView, /followers|metric-grid|listeningStreakDays|totalTetheredMinutes|data-follow/);
  assert.doesNotMatch(optimization, /customer-profile-actions"/);
});
