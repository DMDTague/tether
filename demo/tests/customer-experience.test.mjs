import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const experience = readFileSync(new URL("../experience.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../experience.css", import.meta.url), "utf8");
const doctrine = readFileSync(new URL("../../docs/CUSTOMER_OBSESSION.md", import.meta.url), "utf8");

test("Wavelength gives People and Dating equal, explicit entry points", () => {
  assert.match(index, /class="wavelength-mode-switch"/);
  assert.match(index, /data-wavelength-mode="people"/);
  assert.match(index, /data-wavelength-hub="dating"/);
  assert.match(index, /Music-first discovery and Signals/);
  assert.match(experience, /function reflectWavelengthMode/);
  assert.match(experience, /dating-experience-active/);
});

test("the customer path leads with value while demo truth stays one tap away", () => {
  assert.doesNotMatch(index, /class="evidence-legend"/);
  assert.match(index, /About this demo/);
  assert.match(experience, /function openTrustGuide/);
  for (const label of ["Live workflow", "Demo content", "This device", "Preview"]) {
    assert.match(experience, new RegExp(label));
  }
});

test("the canonical experience layer removes phantom shell space and protects readability", () => {
  assert.match(styles, /\.phone\s*\{[\s\S]*?padding-bottom:\s*0\s*!important/);
  assert.match(styles, /\.view\s*\{[\s\S]*?padding:\s*0 18px 26px\s*!important/);
  assert.match(styles, /--experience-tap:\s*44px/);
  assert.match(styles, /button:focus-visible/);
  assert.match(styles, /@media \(max-width: 370px\)/);
});

test("customer obsession is an enforceable product doctrine", () => {
  for (const promise of [
    "Value before explanation",
    "One obvious next step",
    "Agency is not a premium feature",
    "Privacy behaves exactly as described",
    "Recovery is designed",
    "Accessibility is a completion criterion",
  ]) assert.match(doctrine, new RegExp(promise));
});
