// Prints how loud the voice is over a stretch of the recording, so a cut
// point can be put in a real pause.
// Usage: node scripts/levels.mjs <id | file> <from> <to> [--step 0.05]
import fs from "node:fs";
import { db, fail, parseArgs, peak, RATE, samples, voiceFile } from "./lib.mjs";

const { positional, flags } = parseArgs();
const [target, fromArg, toArg] = positional;
if (!target || fromArg === undefined || toArg === undefined) fail("usage: levels.mjs <id | file> <from> <to> [--step 0.05]");
const from = Number(fromArg);
const to = Number(toArg);
const step = Number(flags.step ?? 0.05);
if ((to - from) / step > 600) fail("More than 600 lines. Narrow the range or raise --step.");

const file = fs.existsSync(target) ? target : voiceFile(target);
const data = samples(file, from, to);
const size = Math.round(step * RATE);
for (let i = 0; i * size < data.length; i++) {
  const level = db(peak(data, i * size, (i + 1) * size));
  const bar = "#".repeat(Math.max(0, Math.round((level + 60) / 2)));
  console.log(`${(from + i * step).toFixed(2).padStart(8)}  ${level.toFixed(0).padStart(4)} dB  ${bar}`);
}
