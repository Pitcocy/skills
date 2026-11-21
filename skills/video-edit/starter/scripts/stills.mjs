// Renders single frames, one bundle for all of them.
// Usage: node scripts/stills.mjs <composition> <frame | 12.5s | @source-second>... [--out <dir>]
//   120     frame 120 of the finished video
//   12.5s   second 12.5 of the finished video
//   @351.2  second 351.2 of the source recording, mapped through cut.json
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fail, FPS, parseArgs, readCut } from "./lib.mjs";

const { positional, flags } = parseArgs();
const [id, ...marks] = positional;
if (!id || marks.length === 0) fail("usage: stills.mjs <composition> <frame | 12.5s | @source-second>... [--out <dir>]");
const outDir = flags.out ?? path.join("out", "stills", id);
fs.mkdirSync(outDir, { recursive: true });

const toFrame = (mark) => {
  if (mark.startsWith("@")) return Math.round(readCut(id).o(Number(mark.slice(1))) * FPS);
  if (mark.endsWith("s")) return Math.round(Number(mark.slice(0, -1)) * FPS);
  return Number(mark);
};

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id });
for (const mark of marks) {
  const frame = Math.min(toFrame(mark), composition.durationInFrames - 1);
  const output = path.join(outDir, `${String(frame).padStart(6, "0")}.jpg`);
  await renderStill({ composition, serveUrl, frame, output, imageFormat: "jpeg", jpegQuality: 88 });
  console.log(`${mark} -> ${output}`);
}
