// Brings one recording into the project.
// Usage: node scripts/intake.mjs <id> [--camera <file>] [--screen <file>]
import fs from "node:fs";
import path from "node:path";
import { fail, ffmpeg, FPS, HEIGHT, parseArgs, probe, videoDir, WIDTH } from "./lib.mjs";

const { positional, flags } = parseArgs();
const [id] = positional;
if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) fail("usage: intake.mjs <id> [--camera <file>] [--screen <file>]   (id: lowercase letters, digits, dashes)");
if (id === "starter-template" || id === "style-sheet") fail(`"${id}" is taken, pick another id.`);
if (!flags.camera && !flags.screen) fail("Give --camera, --screen, or both.");

const publicDir = path.join("public", id);
fs.mkdirSync(publicDir, { recursive: true });

// Everything downstream assumes a constant 30 fps in H.264. The camera is
// cropped to fill 1920x1080; the screen is scaled to fit inside it and the
// engine centres it on the canvas. Only filters that the ffmpeg inside
// Remotion has are used here.
const fill = `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT}`;
const fit = `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2`;
const encode = ["-r", String(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
const voice = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"];

const report = {};
for (const [flag, name, filter] of [["camera", "webcam.mp4", fill], ["screen", "display.mp4", fit]]) {
  const source = flags[flag];
  if (!source) continue;
  if (!fs.existsSync(source)) fail(`${source} not found.`);
  const before = probe(source);
  const target = path.join(publicDir, name);
  const keepVoice = flag === "camera" || !flags.camera;
  if (keepVoice && !before.audioCodec) fail(`${source} has no audio track, and it is the file the voice comes from.`);
  console.log(`${flag}: ${before.width}x${before.height} ${before.fps?.toFixed(2)} fps ${before.videoCodec} ${before.duration.toFixed(2)} s -> ${target}`);
  ffmpeg(["-i", source, "-vf", filter, ...encode, ...(keepVoice ? voice : ["-an"]), target]);
  report[flag] = { before, after: probe(target) };
}

const durations = Object.values(report).map((entry) => entry.after.duration);
const duration = Math.floor(Math.min(...durations) * 100) / 100;
if (durations.length === 2 && Math.abs(durations[0] - durations[1]) > 0.5) {
  console.log(`\nNOTE: camera is ${durations[0].toFixed(2)} s, screen is ${durations[1].toFixed(2)} s. If they did not start at the same moment, set displayOffset in video.tsx.`);
}

const dir = videoDir(id);
if (!fs.existsSync(dir)) {
  const template = videoDir("starter-template");
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(template)) {
    let text = fs.readFileSync(path.join(template, name), "utf8");
    if (name === "video.tsx") {
      text = text
        .replace('id: "starter-template"', `id: "${id}"`)
        .replace('webcam: "starter-template/webcam.mp4"', flags.camera ? `webcam: "${id}/webcam.mp4"` : "webcam: null")
        .replace('display: "starter-template/display.mp4"', flags.screen ? `display: "${id}/display.mp4"` : "display: null")
        .replace('mode: "head"', flags.camera ? 'mode: "head"' : 'mode: "screen"');
    }
    if (name === "cut.json") text = `${JSON.stringify({ keep: [[0, duration]] })}\n`;
    fs.writeFileSync(path.join(dir, name), text);
  }
  console.log(`\nCreated ${dir}/ (video.tsx, graphics.tsx, cut.json, words.json).`);
} else {
  console.log(`\n${dir}/ already exists, left as it is.`);
}

const ids = fs
  .readdirSync(path.join("src", "videos"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "starter-template")
  .map((entry) => entry.name)
  .sort((a, b) => fs.statSync(videoDir(a)).birthtimeMs - fs.statSync(videoDir(b)).birthtimeMs);
fs.writeFileSync(
  path.join("src", "videos", "index.ts"),
  [
    `import type { VideoEntry } from "../engine";`,
    ...ids.map((name, index) => `import { video as v${index} } from "./${name}/video";`),
    "",
    `export const VIDEOS: VideoEntry[] = [${ids.map((_, index) => `v${index}`).join(", ")}];`,
    "",
  ].join("\n"),
);
console.log(`Registered compositions: ${ids.join(", ")}`);
console.log(`Recording length: ${duration} s. cut.json keeps all of it until you set the cut.`);
