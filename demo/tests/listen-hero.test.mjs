import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../v14.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("Listen starts with an immersive Now Playing Hero and inline privacy", () => {
  assert.match(index, /id="listen-hero"[^>]*data-listen-hero/);
  assert.match(app, /class="now-playing-art"/);
  assert.match(app, /data-open-listening[^>]*><span>Open your listening<\/span>/);
  assert.match(app, /data-listen-privacy[^>]*aria-label="Listening privacy"/);
  assert.match(app, />Open Door<\/option>/);
  assert.match(app, />Knock<\/option>/);
  assert.match(app, />Ghost<\/option>/);
  assert.match(styles, /height:clamp\(468px,60dvh,520px\)/);
  assert.match(styles, /\.open-listening-button\{min-height:62px/);
});

test("Listen includes a no-playback prompt with recent quick picks", () => {
  assert.match(app, /if \(!state\.currentTrack\)/);
  assert.match(app, /Start something together\./);
  assert.match(app, /class="quick-pick-list"/);
  assert.match(app, /data-quick-pick=/);
});

test("social rails prioritize five available friends and defer discovery", () => {
  assert.match(index, /id="available-now-list"/);
  assert.match(index, /Continue a Relationship/);
  assert.match(index, /<details id="explore-more" class="explore-more">/);
  assert.match(index, /<strong>Explore More<\/strong>/);
  assert.match(app, /sort\(\(a,b\) => relationshipStrength\(b\) - relationshipStrength\(a\)\)/);
  assert.match(app, /const available = live\.slice\(0,5\)/);
  assert.match(app, /data-home-session=/);
  assert.match(app, /handlePrimaryAction\(profile\)/);
});
