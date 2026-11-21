---
name: video-edit
description: Turn a recording of someone talking to the camera while sharing their screen into a finished video with Remotion. Makes the cut, burned-in captions, graphics beside the speaker, zooms and labels on the screen recording and an end card, then renders and checks the file. Use when the user has a recording to edit, or wants to change or re-render a video made this way.
---

# Video edit: recording in, checked mp4 out

The user records. You do the rest, in a Remotion project that this skill sets up once.
The video is code: one `video.tsx` per recording describes what is on screen when, and
every time in it is a **source second**, a second in the raw recording. The engine maps
source seconds through the cut, so nothing has to be retimed when the cut changes.

The finished video moves between three **modes** on one take:

- `head`: the speaker, full frame. For the opening and the close.
- `split`: the speaker in a card on the left, one graphic per idea on the right. For
  explaining.
- `screen`: the screen recording full bleed, the speaker as a round bubble, with zooms
  and labels. For showing.

Output is 1920x1080 at 30 fps.

## 1. The project

Find the project: a folder with `src/engine/Video.tsx`. Ask the user where it is if
you cannot see one. If there is none, make it:

1. Copy the `starter/` folder next to this file to a place the user picks (suggest
   `~/video-studio`).
2. In it, run `npm install` (or `bun install`; every `node scripts/...` below also runs
   with `bun`).
3. `npm run typecheck` passes.

Needs Node 18 or newer (or Bun), plus git and a C compiler for the captions step (on
macOS: the Xcode command line tools). ffmpeg from the PATH is used when present, the
build inside Remotion otherwise.

If `src/style.ts` is still the default (`name: "Clean"`) and the `video-style` skill is
installed, say once that it sets their own look, then carry on with whatever they
choose.

## 2. Intake

Ask for the **camera file and the screen file of the same recording**, two separate
files that start at the same moment. The camera file carries the voice.

```
node scripts/intake.mjs <id> --camera <file> --screen <file>
```

It re-encodes both to 30 fps H.264 in `public/<id>/` (the camera cropped to fill
1920x1080, the screen scaled to fit inside it), creates `src/videos/<id>/` and
registers the composition `<id>`.

- One file with the face already baked into the screen: pass it as `--screen` alone.
  Only `screen` mode works then. Say what that costs (no full-frame opening, no
  graphics beside the speaker) and ask for separate exports before going on.
- Camera only: pass `--camera` alone. `head` and `split` work.
- The two files did not start together: set `displayOffset` in `video.tsx`, the seconds
  the screen file starts after the camera file.

Then place the face. Render `node scripts/stills.mjs style-sheet 0 --out out/style`
and look at it: it shows this recording in all three modes. Set `face` in `video.tsx`
to the centre of the face in the camera frame (`x`, `y` from 0 to 1 from the top left;
`zoom` is the share of the frame height the bubble shows, default 0.63).

Done when the face sits in the middle of the card and of the bubble on that still.

## 3. The cut

```
node scripts/words.mjs <id> --rough          # add --language nl etc. when not English
```

writes `transcript.txt`, one line per sentence. The first run compiles whisper.cpp and
downloads a 1.5 GB model, so warn the user it takes a few minutes.

Propose the cut to the user as a short list, each with the quoted words and the time:
where the video starts (false starts cluster at the beginning), each stumble worth
dropping, where it ends. Pauses under about 1.2 s are breathing; leave them. The user
decides.

Transcript times can be a second or two off, so place every cut point on the sound:

```
node scripts/levels.mjs <id> <from> <to>
```

prints the voice level every 0.05 s. A kept range starts about 0.1 s before its first
word and ends 0.3 to 0.5 s after its last. Write the ranges to
`src/videos/<id>/cut.json` as `{ "keep": [[start, end], ...] }`.

Done when every start and end in `keep` sits in a stretch that `levels` shows as quiet.

## 4. Captions

```
node scripts/words.mjs <id>
```

transcribes the kept ranges only and writes `words.json`, one entry per word in source
seconds. Rerun it whenever `cut.json` changes. Whisper mishears names, products and
numbers; fix the `text` of those entries by hand.

Done when you have read `words.json` start to end once and every name, product and
number reads the way the user says it.

## 5. The timeline

Before writing any graphic, show the user the plan as a table and get a yes: time,
mode, what is on screen (the idea of each graphic in one line, each zoom, each label).

The plan that works:

- Open in `head` with a lower-third naming the video.
- Go to `split` when the explaining starts. One graphic per idea, one after the other
  with no gap: an empty stage for more than about 3 seconds reads as broken, so start
  the graphic later or change mode later instead.
- Go to `screen` when there is something to show. A banner names each thing the user
  opens, a zoom follows what they read, and the bubble steps aside (`bubbleHidden`)
  while it would cover what is being read.
- Close in `head`, then the end card.

Everything goes in `src/videos/<id>/video.tsx`:

```tsx
export const video = defineVideo({
  id: "my-video",
  webcam: "my-video/webcam.mp4",
  display: "my-video/display.mp4",
  keep: cut.keep,
  words,
  face: { x: 0.49, y: 0.56 },
  modes: [
    { at: 92.85, mode: "head" },
    { at: 115.4, mode: "split" },
    { at: 279.9, mode: "screen" },
    { at: 538.9, mode: "head" },
  ],
  graphics: [
    { from: 115.4, to: 136.5, component: TwoTasks },
    { from: 136.5, to: 172.3, component: BiggerBuild },
  ],
  bubbleHidden: [[299.4, 324.6]],
  zooms: [{ from: 299.2, to: 325.0, x: 0.79, y: 0.3, scale: 1.6 }],
  labels: [
    { at: 93.6, duration: 5.5, title: "The Wayfinder board", subtitle: "A quick preview" },
    { at: 297.2, kind: "banner", title: "Grilling ticket: a conversation with Claude" },
  ],
  endCard: { kicker: "Detailed guide coming", headline: "Let me know what you think" },
});
```

**Mode changes** land on the first word of the sentence that starts the new part; read
the second off `words.json`.

**Graphics** live in `graphics.tsx`, one component per idea, built from the kit in
`src/engine/kit.tsx` (read it: `Board`, `Card`, `Tag`, `In`, `Hl`, `Mark`, `Lines`,
`Arrow`, `Check`, `Tile`, `Type`, `Stamp`). `ExampleGraphic` shows the pattern.

- Draw the idea: boxes, steps, arrows, before and after. A few words per card. The
  voice carries the sentences.
- Every element lands on the word that names it: `const c = useCue()`, then
  `<In at={c(118.16)}>` with the source second of that word from `words.json`.
- A `Board` gives a kicker, a headline and a body of 1144 x 584 px. Position inside the
  body with `abs(left, top, width)`.
- Colours and fonts come from `useStyle()` and `useFonts()` only, so the user's style
  applies to every graphic.

**Zooms**: `x`, `y` is the point of the frame in `screen` mode that ends up in the
middle (0 to 1 from the top left), clamped at the edges so a corner target pins to
its corner. Scale 1.5 to 1.9; past about 1.8 a non-retina recording goes soft. Pick the
point from a still of the screen, then check the zoom on a still.

**Labels**: `banner` (top, names what is on screen), `lower-third` (above the captions,
a name and one line), `callout` (centre, for the one sentence of the video). Default
duration 5 s.

Check as you build, at source seconds:

```
node scripts/stills.mjs <id> @118.5 @299.2      # also: 120 (frame), 12.5s (finished video)
npm run typecheck
```

Done when the plan the user approved is all in `video.tsx`, typecheck passes, and you
have looked at a still of every graphic near its end, with all of its elements in and
nothing overlapping.

## 6. Render

```
node scripts/render.mjs <id>
```

renders 800-frame chunks, then joins them into `out/<id>.mp4`. A long single pass is
what dies halfway, and chunks make changes cheap: after an edit that leaves the length
alone, `--redo 3,4` renders only those chunks again (chunk number = frame / 800,
rounded down). Without `--redo`, any changed source file renders everything again.

## 7. Verify

```
node scripts/check.mjs <id>
```

compares the finished file with the source: length, dead audio, the voice lining up
with the recording on both sides of every cut, the last word clear of the end card.

Then render and look at one still for every zoom (subject in the middle, nothing
pushed off screen), every label (clear of the captions and the bubble), every graphic,
and the end card.

Done when every line of `check.mjs` says PASS and you have looked at every one of those
stills. Tell the user what you checked and where the file is. A FAIL or a skipped
still goes in that report as it is.

## Before the user records

Fullscreen the browser or app being shown, use the sharpest display available, and
record camera and screen as two files. Say the first sentence again after a false
start instead of stopping the recording: the cut removes it.
