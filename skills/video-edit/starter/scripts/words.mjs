// Transcribes the voice with whisper.cpp.
// Usage: node scripts/words.mjs <id> [--rough] [--language en] [--model medium.en]
//   --rough   whole recording, one line per sentence -> transcript.txt (for choosing the cut)
//   default   kept ranges of cut.json only, one entry per word -> words.json (for captions and cues)
import { downloadWhisperModel, installWhisperCpp, transcribe } from "@remotion/install-whisper-cpp";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { clock, fail, ffmpeg, parseArgs, probe, readCut, videoDir, voiceFile } from "./lib.mjs";

const { positional, flags } = parseArgs();
const [id] = positional;
if (!id) fail("usage: words.mjs <id> [--rough] [--language en] [--model medium.en]");

const language = flags.language ?? "en";
const model = flags.model ?? (language === "en" ? "medium.en" : "medium");
const whisperPath = path.resolve("whisper.cpp");
const whisperCppVersion = process.platform === "win32" ? "1.6.0" : "1.7.2";

await installWhisperCpp({ to: whisperPath, version: whisperCppVersion });
await downloadWhisperModel({ model, folder: whisperPath });

const voice = voiceFile(id);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "words-"));

const run = async (from, to, tokenLevelTimestamps) => {
  const wav = path.join(tmp, `${from}.wav`);
  ffmpeg(["-ss", String(from), "-to", String(to), "-i", voice, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  const result = await transcribe({ inputPath: wav, whisperPath, whisperCppVersion, model, tokenLevelTimestamps, language });
  return result.transcription;
};

if (flags.rough) {
  const items = await run(0, probe(voice).duration, false);
  const lines = [];
  let line = null;
  for (const item of items) {
    if (!item.text.trim() || /^\s*[[(]/.test(item.text)) continue;
    if (!line && lines.length > 0 && /^[\s.,?!]+$/.test(item.text)) {
      lines.at(-1).text += item.text.trim();
      continue;
    }
    line ??= { at: item.offsets.from / 1000, text: "" };
    line.text += item.text;
    if (/[.?!]\s*$/.test(line.text) || line.text.length > 140) {
      lines.push(line);
      line = null;
    }
  }
  if (line) lines.push(line);
  const file = path.join(videoDir(id), "transcript.txt");
  fs.writeFileSync(file, `${lines.map((entry) => `[${entry.at.toFixed(1).padStart(6)} s = ${clock(entry.at)}] ${entry.text.trim()}`).join("\n")}\n`);
  console.log(`${lines.length} lines -> ${file}`);
  console.log("These times can be a second or two off. Put the cut points with scripts/levels.mjs.");
  process.exit(0);
}

// A word never shows longer than this before it ends, so a word after a
// pause does not light up during the pause.
const MAX_WORD = 0.4;

const words = [];
for (const [from, to] of readCut(id).keep) {
  const items = await run(from, to, true);
  let previousEnd = 0;
  let current = null;
  const close = () => {
    if (!current) return;
    const text = current.text.trim();
    const end = Math.min(Math.max(current.end, previousEnd + 0.05), to - from);
    if (text && !/^[[(].*[\])]$/.test(text)) {
      words.push({ text, start: round(from + Math.max(previousEnd, end - MAX_WORD)), end: round(from + end) });
      previousEnd = end;
    }
    current = null;
  };
  for (const item of items) {
    for (const token of item.tokens) {
      if (token.text.startsWith("[_")) continue;
      // t_dtw is where the token ends, in hundredths of a second.
      const end = token.t_dtw === -1 ? token.offsets.to / 1000 : token.t_dtw / 100;
      if (token.text.startsWith(" ") || !current) {
        close();
        current = { text: token.text, end };
      } else {
        current.text += token.text;
        current.end = Math.max(current.end, end);
      }
    }
  }
  close();
}

function round(value) {
  return Math.round(value * 100) / 100;
}

const file = path.join(videoDir(id), "words.json");
fs.writeFileSync(file, `[\n${words.map((word) => JSON.stringify(word)).join(",\n")}\n]\n`);
console.log(`${words.length} words -> ${file}`);
console.log("Read it once: names, products and numbers are what whisper gets wrong.");
