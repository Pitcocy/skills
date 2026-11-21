import { defineVideo } from "../../engine";
import cut from "./cut.json";
import words from "./words.json";

// Every time in this file is a second in the source recording. The cut
// lives in cut.json so the scripts can read it too.
export const video = defineVideo({
  id: "starter-template",
  webcam: "starter-template/webcam.mp4",
  display: "starter-template/display.mp4",
  keep: cut.keep,
  words,
  face: { x: 0.5, y: 0.5 },
  modes: [{ at: 0, mode: "head" }],
  graphics: [],
  bubbleHidden: [],
  zooms: [],
  labels: [],
  endCard: { headline: "Thanks for watching" },
});
