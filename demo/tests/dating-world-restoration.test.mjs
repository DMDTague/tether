import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dating = readFileSync(new URL("../dating-world.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../dating-world.css", import.meta.url), "utf8");
const platform = readFileSync(new URL("../platform.js", import.meta.url), "utf8");

test("Dating is a complete first-class world again", () => {
  for (const tab of ["cards", "grid", "signals", "profile"]) {
    assert.match(dating, new RegExp(`data-dating-world-panel=\\"${tab}\\"`));
  }
  assert.match(dating, /Meet someone who gets the song/);
  assert.match(dating, /Music-first discovery/);
  assert.match(dating, /Mutual messages/);
});

test("the visual model deliberately blends cards, dense browse, and musical openings", () => {
  assert.match(dating, /dating-feature-card/);
  assert.match(dating, /dating-browse-grid/);
  assert.match(dating, /Signals are songs, not cold DMs/);
  assert.match(styles, /grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /dating-card-actions/);
  assert.match(styles, /dating-signal-list/);
});

test("the full Dating journey includes setup, privacy, decisions, matches, and chat", () => {
  for (const step of ["Identity", "Photos", "Intent", "Music", "Privacy"]) assert.match(dating, new RegExp(`\\"${step}\\"`));
  for (const action of ["passCurrent", "undoPass", "saveCurrent", "signalCurrent", "showMatch", "openMatchChat", "openFilters"]) assert.match(dating, new RegExp(`function ${action}`));
  assert.match(dating, /Filter only/);
  assert.match(dating, /Do not use/);
  assert.match(dating, /Broad proximity only/);
  assert.doesNotMatch(dating, /\d+(?:\.\d+)?\s*(?:mi|miles)\b/i);
});

test("Dating loads after the audit layer and takes ownership of old entry points", () => {
  assert.match(platform, /window\.addEventListener\(\"load\", loadDatingWorld/);
  assert.match(platform, /dating-world\.js\?v=5/);
  assert.match(platform, /dating-world\.css\?v=5/);
  assert.match(dating, /cloneNode\(true\)/);
  assert.match(dating, /data-dating-mode-toggle/);
  assert.match(dating, /data-wavelength-settings/);
  assert.match(dating, /data-you-tool="dating"/);
});
