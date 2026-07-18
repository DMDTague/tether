import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../v14.js", import.meta.url), "utf8");
const stylesheets = ["styles.css", "platform.css", "optimization.css", "continuity.css"];
const css = stylesheets
  .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8"))
  .join("\n");

test("mobile atmosphere no longer follows the pointer or injects generic ripples", () => {
  assert.doesNotMatch(app, /phone\.addEventListener\("pointermove"/);
  assert.doesNotMatch(app, /document\.addEventListener\("pointerdown"/);
  assert.doesNotMatch(app, /intent-ripple|--touch-[xy]/);
  assert.doesNotMatch(css, /intent-ripple|--touch-[xy]|\.phone::before/);
  assert.doesNotMatch(index, /gel-two|gel-three|gel-caustic/);
  assert.equal((index.match(/class="gel-mass/g) ?? []).length, 1);
});

test("haptics and high-emphasis motion are reserved for Tether events", () => {
  assert.match(app, /function consequentialHaptic\(pattern\)/);
  assert.doesNotMatch(app, /navigator\.vibrate\(\d/);
  assert.match(app, /function startSession\([\s\S]*?consequentialHaptic/);
  assert.match(app, /function endSession\([\s\S]*?consequentialHaptic/);
  assert.match(app, /function firePulse\([\s\S]*?consequentialHaptic/);

  assert.match(css, /\.story-orbit\.tethering\{animation:/);
  assert.match(css, /\.listener-ping::before[\s\S]*?animation: signal/);
  assert.match(css, /\.pulse-button\.pulsing \{ animation:/);
  assert.match(css, /#session-view\.connection-celebration/);
  assert.match(css, /\.phone\.session-complete/);
  assert.match(css, /\.tether-action::before\{/);
  assert.doesNotMatch(css, /\.view\.view-arriving|animation:intentRipple|animation:gelMorph/);
});

test("visible mobile type has a 13px floor and restrained tracking", () => {
  const declaredSizes = [
    ...[...css.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1])),
    ...[...css.matchAll(/font\s*:\s*[^;{}]*?(?<![\d.])(\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1])),
  ];
  const tooSmall = declaredSizes.filter((size) => size > 0 && size < 13);
  assert.deepEqual(tooSmall, []);

  const tracking = [...css.matchAll(/letter-spacing\s*:\s*(-?\d*\.?\d+)(em|px)/g)]
    .map(([, value, unit]) => ({ value: Number(value), unit }))
    .filter(({ value }) => value > 0);
  assert.equal(tracking.some(({ value, unit }) => unit === "em" ? value > 0.05 : value > 0.5), false);
});

test("monospace is limited to synchronization and timing telemetry", () => {
  assert.equal((css.match(/var\(--mono\)/g) ?? []).length, 1);
  assert.match(css, /\.sync,[\s\S]*?\.session-time,[\s\S]*?\[data-session-timer\][\s\S]*?font-family: var\(--mono\)/);
  assert.doesNotMatch(css, /\.trend-rank[^{}]*var\(--mono\)|\.listener-count[^{}]*var\(--mono\)|\.message-receipt[^{}]*var\(--mono\)/);
});
