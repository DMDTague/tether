import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../v14.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => Number.parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("primary navigation exposes linked, selected tab semantics", () => {
  assert.match(index, /<nav class="bottom-nav" aria-label="Main navigation">/);
  assert.match(index, /class="bottom-nav-tablist" role="tablist" aria-label="Primary views"/);
  assert.match(index, /id="listen-tab"[^>]*role="tab"[^>]*aria-controls="home-view"[^>]*aria-selected="true"/);
  assert.match(index, /id="people-tab"[^>]*role="tab"[^>]*aria-controls="messages-view"[^>]*aria-selected="false"/);
  assert.match(index, /id="you-tab"[^>]*role="tab"[^>]*aria-controls="you-view"[^>]*aria-selected="false"/);
  assert.match(index, /id="home-view"[^>]*role="tabpanel"[^>]*aria-labelledby="listen-tab"/);
  assert.match(app, /button\.setAttribute\("aria-selected", String\(isActive\)\)/);
  assert.match(app, /handleTablistKeys/);
});

test("Tether, privacy, playback, and Pulse controls have descriptive labels", () => {
  assert.match(index, /data-tether-action aria-label="Open your listening"/);
  assert.match(app, /data-listen-privacy aria-label="Listening privacy"/);
  assert.match(app, /data-host-pause aria-label="Pause your stage"/);
  assert.match(app, /data-pulse aria-label="Send a Pulse; press and hold for 1\.5 seconds" aria-describedby="pulse-instruction"/);
  assert.match(app, /event\.currentTarget\.setAttribute\("aria-label", actionLabel\)/);
});

test("meaningful sessions save an Anchor before the optional feeling prompt", () => {
  assert.match(app, /MIN_MEANINGFUL_SESSION_MS = 5 \* 60 \* 1000/);
  assert.match(app, /durationMs >= MIN_MEANINGFUL_SESSION_MS/);
  assert.match(app, /state\.pulsesThisSession > 0/);
  assert.doesNotMatch(app, /\(isSelf && state\.sessionGuestJoined\)/);
  assert.match(index, /What did this one feel like\?/);
  assert.match(index, /aria-modal="false"/);
  assert.match(index, /The song, person, date, and duration are already safe/);
  assert.match(index, /id="anchor-feeling"[^>]*maxlength="160"/);

  const endSession = app.slice(app.indexOf("function endSession()"), app.indexOf("function startPulseCharge"));
  assert.ok(endSession.indexOf("anchors.unshift(savedAnchor)") < endSession.indexOf("showAnchorFeelingPrompt(savedAnchor, companion)"));
  assert.match(app, /hideAnchorFeelingPrompt\(true\);\s*toast\("Memory Anchor saved automatically\."\)/);
  assert.match(app, /anchor\.feeling = feeling/);
  assert.match(app, /class="anchor-feeling"/);
});

test("focus treatment is visible and metadata accents meet AA contrast", () => {
  assert.match(styles, /:where\(button,\[href\],input,select,textarea,summary/);
  assert.match(styles, /outline:3px solid #9FE8D2!important/);
  const surface = styles.match(/--surface-3:\s*(#[0-9A-F]{6})/i)?.[1];
  assert.ok(surface);
  for (const token of ["dim", "presence", "signal", "sync"]) {
    const value = styles.match(new RegExp(`--${token}:\\s*(#[0-9A-F]{6})`, "i"))?.[1];
    assert.ok(value, `missing --${token}`);
    assert.ok(contrastRatio(value, surface) >= 4.5, `--${token} must meet AA on --surface-3`);
  }
});
