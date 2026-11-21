// Checks the finished file against the source recording.
// Usage: node scripts/check.mjs <id>
import fs from "node:fs";
import path from "node:path";
import { clock, db, fail, FPS, parseArgs, peak, probe, RATE, readCut, samples, voiceFile } from "./lib.mjs";

const [id] = parseArgs().positional;
if (!id) fail("usage: check.mjs <id>");
const final = path.join("out", `${id}.mp4`);
if (!fs.existsSync(final)) fail(`${final} not found. Render first.`);

const cut = readCut(id);
const voice = voiceFile(id);
const info = probe(final);
const takeSeconds = cut.takeFrames / FPS;
let failed = false;
const line = (ok, text) => {
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${text}`);
};

const frames = info.frames ?? Math.round(info.duration * FPS);
line(Math.abs(info.duration - frames / FPS) < 0.05, `length: ${info.duration.toFixed(2)} s, ${frames} frames (take ${cut.takeFrames} + end card ${frames - cut.takeFrames})`);
line(info.width === 1920 && info.height === 1080 && Math.abs((info.fps ?? 0) - FPS) < 0.01, `picture: ${info.width}x${info.height} at ${info.fps} fps`);
line(Boolean(info.audioCodec), `audio track: ${info.audioCodec ?? "none"}`);

const out = samples(final);
const dead = [];
for (let second = 0; second < Math.floor(takeSeconds); second++) {
  if (db(peak(out, second * RATE, (second + 1) * RATE)) < -70) dead.push(second);
}
line(dead.length === 0, dead.length === 0 ? "no dead second of audio before the end card" : `dead audio at ${dead.map(clock).join(", ")}`);

// The same second of speech, taken from the source and from the finished
// file, has to line up.
const envelope = (data) => {
  const size = RATE / 1000;
  return Float32Array.from({ length: Math.floor(data.length / size) }, (_, i) => peak(data, i * size, (i + 1) * size));
};
const align = (a, b) => {
  let best = { lag: 0, score: -1 };
  for (let lag = -300; lag <= 300; lag++) {
    let dot = 0, aa = 0, bb = 0;
    for (let i = 300; i < a.length - 300; i++) {
      const x = a[i], y = b[i + lag] ?? 0;
      dot += x * y; aa += x * x; bb += y * y;
    }
    const score = aa && bb ? dot / Math.sqrt(aa * bb) : 0;
    if (score > best.score) best = { lag, score };
  }
  return best;
};

const WINDOW = 1.6;
const drift = [];
for (const segment of cut.segments) {
  const length = segment.end - segment.start;
  if (length < WINDOW + 0.2) continue;
  const points = length < 6 ? [segment.start] : [segment.start, segment.start + length / 2 - WINDOW / 2, segment.end - WINDOW - 0.1];
  for (const point of points) {
    const source = envelope(samples(voice, point, point + WINDOW));
    const at = Math.round(cut.o(point) * RATE);
    const rendered = envelope(out.subarray(at, at + Math.round(WINDOW * RATE)));
    if (db(peak(source)) < -45) continue;
    drift.push({ point, ...align(source, rendered) });
  }
}
const off = drift.filter((entry) => Math.abs(entry.lag) > 40 || entry.score < 0.8);
line(
  drift.length > 0 && off.length === 0,
  off.length === 0
    ? `voice matches the source at ${drift.length} points (largest offset ${Math.max(0, ...drift.map((entry) => Math.abs(entry.lag)))} ms)`
    : `voice does not match the source at source second ${off.map((entry) => `${entry.point.toFixed(1)} (offset ${entry.lag} ms, match ${entry.score.toFixed(2)})`).join(", ")}`,
);

// Where speech stops, measured against the loudest part of the take.
const loud = peak(out, 0, Math.round(takeSeconds * RATE));
const size = RATE / 20;
let lastSound = 0;
for (let i = Math.floor((takeSeconds * RATE) / size); i >= 0; i--) {
  if (peak(out, i * size, (i + 1) * size) > loud * 0.03) {
    lastSound = ((i + 1) * size) / RATE;
    break;
  }
}
const gap = takeSeconds - lastSound;
line(gap >= 0.2, `last word ends ${gap.toFixed(2)} s before the take ends at ${clock(takeSeconds)}${gap < 0.2 ? " (the end is cutting into speech, or too tight)" : ""}`);

const tail = out.subarray(Math.round((takeSeconds + 0.5) * RATE));
if (tail.length > 0) line(db(peak(tail)) < -50, `end card is quiet (${db(peak(tail)).toFixed(0)} dB)`);

console.log(failed ? "\nNot done: fix the FAIL lines and render again." : "\nAll checks passed. Still look at the stills: one per zoom, one per label, one per graphic, the end card.");
process.exit(failed ? 1 : 0);
