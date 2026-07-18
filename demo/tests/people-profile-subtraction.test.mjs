import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../v14.js", import.meta.url), "utf8");
const platform = readFileSync(new URL("../platform.js", import.meta.url), "utf8");
const optimization = readFileSync(new URL("../optimization.js", import.meta.url), "utf8");

test("People starts with live friends, evidence-backed introductions, and a secondary inbox", () => {
  assert.match(index, /<details class="people-inbox">/);
  assert.match(index, /Friends Available Now/);
  assert.match(index, /Friends of Friends/);
  assert.match(app, /slice\(0, 5\)/);
  assert.match(app, /data-people-join=/);
  assert.match(app, /handlePrimaryAction\(profile\)/);
  assert.match(app, /function connectionEvidence\(profile\)/);
  assert.match(app, /shared artists?/);
  assert.match(app, /mutual .*connections?/);
});

test("Dating Mode is explicit and the old Wavelength questionnaire is absent", () => {
  assert.match(index, /data-dating-mode-toggle aria-pressed="false"/);
  assert.match(app, /datingMode: false/);
  assert.match(app, /Turn on Dating Mode\?/);
  assert.match(app, /data-enable-dating/);
  assert.doesNotMatch(app, /openWavelengthOnboarding|data-onboard-|data-height|data-weight|data-orientation/);
  assert.doesNotMatch(platform, /Dealbreaker artist|name="height"|name="ageMin"|identity layers complete/);
});

test("synthetic match percentages are removed from discovery and profiles", () => {
  assert.doesNotMatch(app, /function compatibility\(|compatibility\(profile\)|percent music compatibility|% vibe match|% match|shared\.score|% shared frequency/);
  assert.match(app, /evidence-chips wavelength-evidence/);
  assert.match(app, /class="profile-evidence-inline"/);
});

test("other-user profiles only present identity, evidence, and direct actions", () => {
  const profileStart = app.indexOf("function openProfile(username)");
  const profileEnd = app.indexOf("function closeProfile()", profileStart);
  const profileView = app.slice(profileStart, profileEnd);
  assert.match(profileView, /Who|simplified-profile-hero/);
  assert.match(profileView, /Why connect\?/);
  assert.match(profileView, /data-session/);
  assert.match(profileView, /data-message/);
  assert.doesNotMatch(profileView, /followers|metric-grid|listeningStreakDays|totalTetheredMinutes|data-follow/);
  assert.doesNotMatch(optimization, /customer-profile-actions"/);
});
