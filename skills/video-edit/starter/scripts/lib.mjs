import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

if (!fs.existsSync("src/engine")) {
  console.error("Run this from the root of the video project (the folder with src/engine).");
  process.exit(1);
}

fs.mkdirSync("public", { recursive: true });

export const fail = (message) => {
  console.error(message);
  process.exit(1);
};

export const parseArgs = (argv = process.argv.slice(2)) => {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[arg.slice(2)] = true;
      else flags[arg.slice(2)] = argv[++i];
    } else positional.push(arg);
  }
  return { positional, flags };
};

const windows = process.platform === "win32";
const works = (bin) => spawnSync(bin, ["-version"], { stdio: "ignore", shell: windows }).status === 0;
const system = process.env.VIDEO_FFMPEG !== "bundled" && works("ffmpeg") && works("ffprobe");

// The ffmpeg on the PATH when there is one, otherwise the build that ships
// with Remotion.
const tool = (name, args, options = {}) => {
  const [bin, prefix] = system ? [name, []] : ["npx", ["remotion", name]];
  const result = spawnSync(bin, [...prefix, ...args], {
    maxBuffer: 2 ** 30,
    shell: windows,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.status !== 0) fail(`${name} ${args.join(" ")}\n${result.stderr?.toString() ?? result.error}`);
  return result.stdout;
};

export const ffmpeg = (args, options) => tool("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], options);

export const probe = (file) => {
  const out = tool("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]);
  const info = JSON.parse(out.toString());
  const video = info.streams.find((stream) => stream.codec_type === "video");
  const audio = info.streams.find((stream) => stream.codec_type === "audio");
  const [num, den] = (video?.avg_frame_rate ?? "0/1").split("/").map(Number);
  return {
    duration: Number(info.format.duration),
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps: video && den ? num / den : null,
    frames: video?.nb_frames ? Number(video.nb_frames) : null,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
  };
};

export const RATE = 8000;

// Mono samples between -1 and 1 at 8 kHz. Read as WAV because the ffmpeg
// inside Remotion has no raw PCM output.
export const samples = (file, from, to) => {
  const wav = ffmpeg([
    ...(from === undefined ? [] : ["-ss", String(from), "-to", String(to)]),
    "-i", file, "-vn", "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", "-f", "wav", "-",
  ]);
  const data = wav.indexOf("data", 12, "latin1");
  if (data === -1) fail(`No audio could be read from ${file}.`);
  const body = wav.subarray(data + 8);
  const view = new Int16Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength - (body.byteLength % 2)));
  return Float32Array.from(view, (value) => value / 32768);
};

export const db = (value) => (value <= 0 ? -120 : Math.max(-120, 20 * Math.log10(value)));

export const peak = (data, from = 0, to = data.length) => {
  let max = 0;
  for (let i = Math.max(0, from); i < Math.min(data.length, to); i++) max = Math.max(max, Math.abs(data[i]));
  return max;
};

export const videoDir = (id) => path.join("src", "videos", id);

export const voiceFile = (id) => {
  const file = ["webcam.mp4", "display.mp4"].map((name) => path.join("public", id, name)).find((candidate) => fs.existsSync(candidate));
  if (!file) fail(`No recording in public/${id}/. Run scripts/intake.mjs first.`);
  return file;
};

export const readCut = (id) => {
  const file = path.join(videoDir(id), "cut.json");
  if (!fs.existsSync(file)) fail(`${file} not found.`);
  const { keep } = JSON.parse(fs.readFileSync(file, "utf8"));
  const segments = [];
  for (const [start, end] of keep) {
    const previous = segments.at(-1);
    const srcFrom = Math.round(start * FPS);
    segments.push({ start, end, srcFrom, from: previous ? previous.from + previous.frames : 0, frames: Math.round(end * FPS) - srcFrom });
  }
  const takeFrames = segments.reduce((total, segment) => total + segment.frames, 0);
  // Same mapping as src/engine/clock.ts: source second -> second in the video.
  const o = (src) => {
    const srcFrame = src * FPS;
    let out = 0;
    for (const segment of segments) {
      if (srcFrame < segment.srcFrom) return out / FPS;
      if (srcFrame < segment.srcFrom + segment.frames) return (segment.from + srcFrame - segment.srcFrom) / FPS;
      out = segment.from + segment.frames;
    }
    return out / FPS;
  };
  return { keep, segments, takeFrames, o };
};

export const clock = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(2).padStart(5, "0")}`;
};
