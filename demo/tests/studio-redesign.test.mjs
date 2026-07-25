import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = name => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const index = source("index.html");
const studio = source("studio.js");
const styles = source("studio.css");
const pulse = source("v14.js");
const architecture = readFileSync(new URL("../../docs/EXPERIENCE_ARCHITECTURE.md", import.meta.url), "utf8");

test("the redesign is the final canonical presentation layer", () => {
  assert.match(index, /studio\.css\?v=1/);
  assert.match(index, /onboarding\.js\?v=2[\s\S]*studio\.js\?v=1/);
  assert.match(studio, /tether-studio-v1/);
  assert.match(styles, /Tether Studio/);
});

test("feature placement follows customer intention instead of dashboard density", () => {
  for (const behavior of [
    "function curateListen",
    "function curateExchange",
    "function curatePeople",
    "function curateYou",
    "For later",
    "Recommendations and memories",
    "Philadelphia is listening",
    "Everything has a home",
  ]) assert.match(studio, new RegExp(behavior));

  for (const rule of [
    "Current playback owns the first viewport",
    "Show cultural content before tool explanation",
    "Dating becomes visually self-contained",
    "Tools are grouped by customer intention",
  ]) assert.match(architecture, new RegExp(rule));
});

test("the visual system has strong hierarchy without carding every section", () => {
  for (const token of [
    "--studio-paper",
    "--studio-coral",
    "--studio-cyan",
    "--studio-violet",
    "--studio-yellow",
  ]) assert.match(styles, new RegExp(token));

  assert.match(styles, /\.review-card\s*\{[\s\S]*?border-radius:\s*0/);
  assert.match(styles, /\.bottom-nav,[\s\S]*?grid-template-columns:\s*1fr 1fr 92px 1fr 1fr/);
  assert.match(styles, /\.wavelength-mode-switch > button\.active/);
  assert.match(styles, /\.studio-you-groups/);
});

test("Dating reaches a candidate before repeating profile administration", () => {
  assert.match(styles, /\.dating-world-identity,[\s\S]*?display:\s*none/);
  assert.match(styles, /\.dating-world-principles[\s\S]*?display:\s*none/);
  assert.match(styles, /\.dating-feature-photo\s*\{[\s\S]*?aspect-ratio:\s*\.88/);
  assert.match(studio, /reflectPeopleMode/);
  assert.match(studio, /Meet through taste\. Start with a song\./);
});

test("Pulse is a full-stage relational ritual rather than a generic flash", () => {
  assert.match(pulse, /Keep holding — let it build/);
  assert.match(pulse, /Release — send it/);
  assert.match(pulse, /pulse-transmission/);
  assert.match(pulse, /\$\{recipient\} felt your Pulse/);
  assert.doesNotMatch(pulse, /Pulse sent to \$\{state\.session\.name\}/);

  for (const animation of [
    "studio-pulse-in",
    "studio-pulse-release",
    "studio-pulse-ring",
    "studio-stage-bloom",
    "studio-listener-answer",
    "studio-art-answer",
  ]) assert.match(styles, new RegExp(animation));
});

