import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { CANDIDATES } from "../style-candidates";
import { VIDEOS } from "../videos";
import { HEIGHT, WIDTH } from "./clock";
import { abs, Arrow, Board, Card, Check, Hl, In, pop, Tag, useFonts, useT } from "./kit";
import type { Mode, Style, VideoDef } from "./types";
import { resolve, Video } from "./Video";

// One row per candidate look, one tile per mode, all on a moment of the
// newest recording in the project. The video-style skill renders this as a
// single still.
const TILE_WIDTH = 608;
const TILE_HEIGHT = (TILE_WIDTH * HEIGHT) / WIDTH;
const ROW_HEIGHT = TILE_HEIGHT + 76;
const CLIP_SECONDS = 8;
// Late enough that the label, the caption and the graphic are all in.
const SHOWN_FRAME = 150;

export const STYLE_SHEET_HEIGHT = Math.round(30 + Math.max(1, CANDIDATES.length) * ROW_HEIGHT);

const SampleGraphic: React.FC = () => {
  const t = useT();
  const fonts = useFonts();
  const steps = ["Record", "Cut", "Publish"];
  return (
    <Board kicker="How it works" headline={<>One idea per <Hl>graphic</Hl></>}>
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <In at={0.6 + i * 0.5} style={abs(i * 390, 20, 330)}>
            <Card tone={i === 0 ? "accent" : "plain"} style={{ height: 190 }}>
              <Tag>{`Step ${i + 1}`}</Tag>
              <div style={{ ...fonts.title, fontSize: 56, marginTop: 14 }}>{label}</div>
            </Card>
          </In>
          {i > 0 ? <Arrow x1={i * 390 - 52} y1={115} x2={i * 390 - 14} y2={115} p={pop(t, 0.5 + i * 0.5, 0.25)} /> : null}
        </React.Fragment>
      ))}
      <In at={2.2} style={abs(0, 270, 720)}>
        <Card tone="second" style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 32 }}>
          <Check />
          Each part lands on the word that names it
        </Card>
      </In>
    </Board>
  );
};

const sample = (source: VideoDef, mode: Mode): VideoDef => {
  const [start = 0, end = start + CLIP_SECONDS] = source.keep[0] ?? [];
  const at = start + Math.max(0, Math.min(8, (end - start - CLIP_SECONDS) / 2));
  const caption = ["This", "is", "how", "your", "captions", "will", "look."];
  return {
    ...source,
    id: `style-${mode}`,
    keep: [[at, at + CLIP_SECONDS]],
    modes: [{ at, mode }],
    graphics: mode === "split" ? [{ from: at, to: at + CLIP_SECONDS, component: SampleGraphic }] : [],
    zooms: [],
    bubbleHidden: [],
    labels:
      mode === "head"
        ? [{ at: at + 3.5, kind: "lower-third", title: "Your name here", subtitle: "One line about this video" }]
        : mode === "screen"
          ? [{ at: at + 3.5, kind: "banner", title: "A label for what is on screen" }]
          : [],
    words: caption.map((text, i) => ({ text, start: at + 4 + i * 0.28, end: at + 4.28 + i * 0.28 })),
    endCard: null,
    style: undefined,
  };
};

const Tile: React.FC<{ def: VideoDef; style: Style }> = ({ def, style }) => {
  const video = React.useMemo(() => resolve(def), [def]);
  return (
    <div style={{ width: TILE_WIDTH, height: TILE_HEIGHT, overflow: "hidden", position: "relative", borderRadius: 6 }}>
      <div style={{ ...abs(0, 0, WIDTH, HEIGHT), scale: String(TILE_WIDTH / WIDTH), transformOrigin: "0 0" }}>
        <Sequence from={-SHOWN_FRAME} layout="none">
          <Video video={video} style={style} />
        </Sequence>
      </div>
    </div>
  );
};

export const StyleSheet: React.FC = () => {
  const source = VIDEOS.at(-1)?.def;
  const text: React.CSSProperties = { fontFamily: "system-ui, sans-serif", color: "#111" };
  if (!source) {
    return (
      <AbsoluteFill style={{ ...text, background: "#fff", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
        Bring in a recording first (scripts/intake.mjs), then render this sheet again.
      </AbsoluteFill>
    );
  }
  const modes: Mode[] = [
    ...(source.webcam ? (["head", "split"] as const) : []),
    ...(source.display ? (["screen"] as const) : []),
  ];
  const defs = modes.map((mode) => sample(source, mode));
  return (
    <AbsoluteFill style={{ ...text, background: "#fff", padding: "30px 40px 0" }}>
      {CANDIDATES.map((candidate, index) => (
        <div key={index} style={{ height: ROW_HEIGHT }}>
          <div style={{ fontSize: 30, fontWeight: 700, height: 46 }}>
            {String.fromCharCode(65 + index)} · {candidate.name}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {defs.map((def) => (
              <Tile key={def.id} def={def} style={candidate} />
            ))}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
