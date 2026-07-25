import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../v14.js", import.meta.url), "utf8");
const deliverStyles = readFileSync(new URL("../deliver-ui.css", import.meta.url), "utf8");

function primaryNavigation() {
  const match = index.match(/<nav class="bottom-nav[^\"]*"[\s\S]*?<\/nav>/);
  assert.ok(match, "bottom navigation should exist");
  return match[0];
}

test("primary navigation exposes Listen, Exchange, Tether, Wavelength, and You", () => {
  const navigation = primaryNavigation();
  const labels = [...navigation.matchAll(/class="nav-item[^>]*"[\s\S]*?<small>([^<]+)<\/small>/g)].map(match => match[1]);
  const destinations = [...navigation.matchAll(/class="nav-item[^>]*data-view="([^"]+)"/g)].map(match => match[1]);

  assert.deepEqual(labels, ["Listen", "Exchange", "Wavelength", "You"]);
  assert.deepEqual(destinations, ["home", "activity", "messages", "you"]);
  assert.match(navigation, /class="tether-action"/);
  assert.match(navigation, /<span>Tether<\/span>/);
});

test("the five-position navigation resets the legacy three-column shell", () => {
  assert.match(deliverStyles, /\.bottom-nav\.deliver-bottom-nav\s*\{[\s\S]*?display:\s*block\s*!important/);
  assert.match(deliverStyles, /grid-template-columns:\s*none\s*!important/);
  assert.match(deliverStyles, /\.deliver-bottom-nav \.bottom-nav-tablist\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(deliverStyles, /\.deliver-bottom-nav \.nav-item\s*\{[\s\S]*?width:\s*100%\s*!important/);
  assert.match(deliverStyles, /text-overflow:\s*ellipsis/);
});

test("the persistent Tether action opens the listening flow", () => {
  const navigation = primaryNavigation();

  assert.match(navigation, /data-tether-action/);
  assert.match(navigation, /aria-label="Open your listening"/);
  assert.match(app, /\$\("\[data-tether-action\]"\)\.addEventListener\("click", openCurrentListening\)/);
  assert.match(app, /function openCurrentListening\(\)/);
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
