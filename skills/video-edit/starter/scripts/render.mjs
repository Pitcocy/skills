// Renders one video in chunks and joins them: out/<id>.mp4
// Usage: node scripts/render.mjs <id> [--redo 2,5] [--fresh] [--chunk 800] [--concurrency n]
//   Chunks that are already on disk are reused only while no source file
//   changed since they were made. After an edit, either let it render all
//   again or name the chunks the edit touched with --redo.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fail, ffmpeg, parseArgs } from "./lib.mjs";

const { positional, flags } = parseArgs();
const [id] = positional;
if (!id) fail("usage: render.mjs <id> [--redo 2,5] [--fresh] [--chunk 800] [--concurrency n]");
const chunkSize = Number(flags.chunk ?? 800);
const redo = new Set(String(flags.redo ?? "").split(",").filter(Boolean).map(Number));
const concurrency = flags.concurrency ? Number(flags.concurrency) : null;

const outDir = path.join("out", id);
fs.mkdirSync(outDir, { recursive: true });

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
const fingerprint = () => {
  const hash = crypto.createHash("sha1");
  for (const file of [...walk("src"), ...walk(path.join("public", id))].sort()) {
    const stat = fs.statSync(file);
    hash.update(`${file}:${stat.size}:${stat.mtimeMs}\n`);
  }
  return hash.digest("hex");
};

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id });
const total = composition.durationInFrames;

const stateFile = path.join(outDir, "chunks.json");
const state = { fingerprint: fingerprint(), total, chunkSize };
const previous = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : null;
const sameShape = previous && previous.total === total && previous.chunkSize === chunkSize;
const reuse = !flags.fresh && sameShape && (previous.fingerprint === state.fingerprint || redo.size > 0);
if (previous && !reuse) console.log("Sources changed since the last render (or --fresh): rendering every chunk again.");

const chunks = [];
for (let start = 0, index = 0; start < total; start += chunkSize, index++) {
  chunks.push({ index, start, end: Math.min(start + chunkSize, total) - 1 });
}

const renderChunk = async (chunk, name, options) => {
  const file = path.join(outDir, name);
  if (reuse && !redo.has(chunk.index) && fs.existsSync(file) && fs.statSync(file).size > 0) {
    console.log(`${name}: reused`);
    return;
  }
  for (let attempt = 1; ; attempt++) {
    try {
      console.log(`${name}: frames ${chunk.start}-${chunk.end}${attempt > 1 ? ` (attempt ${attempt})` : ""}`);
      await renderMedia({
        composition,
        serveUrl,
        outputLocation: file,
        frameRange: [chunk.start, chunk.end],
        concurrency,
        timeoutInMilliseconds: 120000,
        ...options,
      });
      return;
    } catch (error) {
      fs.rmSync(file, { force: true });
      if (attempt === 4) fail(`${name} failed 4 times:\n${error}`);
    }
  }
};

const pad = (index) => String(index).padStart(3, "0");
for (const chunk of chunks) await renderChunk(chunk, `video_${pad(chunk.index)}.mp4`, { codec: "h264", muted: true });
for (const chunk of chunks) await renderChunk(chunk, `audio_${pad(chunk.index)}.wav`, { codec: "wav" });
fs.writeFileSync(stateFile, JSON.stringify(state));

const list = (prefix, extension) => {
  const file = path.join(outDir, `${prefix}.txt`);
  fs.writeFileSync(file, chunks.map((chunk) => `file '${prefix}_${pad(chunk.index)}.${extension}'`).join("\n"));
  return file;
};
const video = path.join(outDir, "video.mp4");
const audio = path.join(outDir, "audio.wav");
const final = path.join("out", `${id}.mp4`);
ffmpeg(["-f", "concat", "-safe", "0", "-i", list("video", "mp4"), "-c", "copy", video]);
ffmpeg(["-f", "concat", "-safe", "0", "-i", list("audio", "wav"), "-c", "copy", audio]);
ffmpeg(["-i", video, "-i", audio, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final]);

console.log(`\n${final}: ${total} frames, ${chunks.length} chunks of ${chunkSize}`);
console.log(`Next: node scripts/check.mjs ${id}`);
