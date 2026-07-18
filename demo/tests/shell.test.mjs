import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../v14.js", import.meta.url), "utf8");

function primaryNavigation() {
  const match = index.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/);
  assert.ok(match, "bottom navigation should exist");
  return match[0];
}

test("primary navigation exposes exactly Listen, People, and You", () => {
  const navigation = primaryNavigation();
  const labels = [...navigation.matchAll(/class="nav-item[^>]*"[\s\S]*?<small>([^<]+)<\/small>/g)].map(match => match[1]);
  const destinations = [...navigation.matchAll(/class="nav-item[^>]*data-view="([^"]+)"/g)].map(match => match[1]);

  assert.deepEqual(labels, ["Listen", "People", "You"]);
  assert.deepEqual(destinations, ["home", "messages", "you"]);
  assert.doesNotMatch(navigation, />Wavelength</);
  assert.doesNotMatch(navigation, />Exchange</);
});

test("the persistent Tether action opens the listening flow", () => {
  const navigation = primaryNavigation();

  assert.match(navigation, /data-tether-action/);
  assert.match(navigation, /aria-label="Open your listening"/);
  assert.match(app, /\$\("\[data-tether-action\]"\)\.addEventListener\("click", chooseOwnTrack\)/);
  assert.match(app, /<h3>Open your listening<\/h3>/);
});

test("Join is immediate and Knock remains a request", () => {
  const action = app.match(/function handlePrimaryAction\(profile\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(action, "primary session action should exist");

  assert.doesNotMatch(app, /presenceGuideSeen|explainPresenceThen|data-presence-continue/);
  assert.match(action, /profile\.privacyMode === "knock-first"/);
  assert.match(action, /toast\(`Knock sent to \$\{profile\.name\}`\)/);
  assert.doesNotMatch(action, /setTimeout\(\(\) => startSession/);
  assert.match(action, /else \{\s*startSession\(profile\);/);
});
