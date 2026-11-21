---
name: video-style
description: Set or fine-tune the look of the videos the video-edit skill makes (colours, fonts, cards, captions, speaker bubble, logo and end card) by showing candidate looks on the user's own recording and letting them pick. Use when the user wants their own video style, or wants to change it.
---

# Video style: pick the look by looking at it

The look of every video in a `video-edit` project is one file, `src/style.ts`. This
skill fills it by rounds: you put candidate looks side by side on a frame of the
user's own recording, they answer with a letter, the next round goes one level deeper.
Nobody can say which caption style they want. Everybody can point at one.

## 1. What you need

- The project: the folder with `src/engine/Video.tsx`. If there is none, the
  `video-edit` skill makes it.
- One recording brought in with `scripts/intake.mjs`, so the candidates show the
  user's own face and screen. `face` in that recording's `video.tsx` is set (step 2 of
  `video-edit`).

## 2. Ask once

One message, every line optional, "no idea" is a fine answer:

1. Brand colours (hex values, or a site or logo to take them from)
2. Fonts (Google Font names, or font files)
3. Logo file, and the line under it on the end card (site or handle)
4. A video or channel whose look they like
5. Light or dark

## 3. Round one: direction

Write three candidates to `src/style-candidates.ts` that differ in kind (a light one,
a dark one, one where the brand colour is the background), each a full `Style` with a
`name`. With brand colours given, all three use them; the difference is how.

```
node scripts/stills.mjs style-sheet 0 --out out/style
```

renders one image: a row per candidate, the three modes of a video per row (speaker
full frame, speaker in the card beside a graphic, screen recording with the bubble),
each with a caption and a label. Look at it yourself first and fix what is broken
(text that does not contrast, a font that did not load), then open it for the user and
ask for a letter and what they would change.

## 4. Next rounds: one thing at a time

Keep the winner and vary one thing per round, in this order, skipping what the user
is already happy with:

1. Title font and weight
2. Cards: `radius`, `border`, `shadow` (`soft`, `hard`, `none`)
3. Captions: `fontSize`, `maxChars`, `radius`, surface and highlight colour, or `show: false`
4. Bubble: `size` and `corner`

Three candidates per round, same command, same question. Stop when the user says it
is right.

## 5. Save

Write the winner to `src/style.ts` as `STYLE`, with its font imports, and leave
`style-candidates.ts` exporting `[STYLE]`. Copy a logo to `public/brand/` and set
`brand.logo` to its path under `public/` and `brand.line` to the end card line.

Done when `npm run typecheck` passes and the user has seen a last sheet rendered from
the saved `STYLE`. Videos pick the style up on their next render; nothing in a
`video.tsx` changes.

## What the fields drive

`src/engine/types.ts` holds the `Style` type. What it does not say:

- `colors.background` is the canvas behind the card and the graphics; `surface` is the
  cards; `ink` and `muted` are text on both.
- `colors.accent` is the headline highlight, kickers, checks, and with `shadow: "hard"`
  the offset shadow of the speaker card. `accentText` is text on top of accent.
  `second` marks the one thing per graphic that differs.
- `captionSurface`, `captionText`, `captionHighlight` are the captions and the labels.
  Both sit on top of moving video, so the surface stays close to opaque and the text
  contrasts hard with it. The highlight is the word being spoken.
- `fonts.body.weight` is the caption weight: 600 or more stays readable on video.
  `fonts.label` is kickers and banners.

Fonts load per file, at the top of `style.ts` or `style-candidates.ts`:

```ts
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
const grotesk = loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
```

List only the weights the style uses, and add `"latin-ext"` when the user's language
needs it (typecheck fails if the font has no such subset). For a font file, add
`@remotion/fonts` at the same version as `remotion` in `package.json`, put the file in
`public/fonts/`, and call its `loadFont({ family, url: staticFile("fonts/x.woff2"), weight })`.
