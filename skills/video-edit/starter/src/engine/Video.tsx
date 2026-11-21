import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "./Captions";
import { FPS, HEIGHT, makeClock, WIDTH } from "./clock";
import type { Clock } from "./clock";
import { GraphicContext, mix, pop, STAGE, Tag, useT } from "./kit";
import { Labels } from "./Labels";
import type { Label } from "./Labels";
import { font, StyleContext, useStyle } from "./style-context";
import type { Mode, Style, VideoDef, VideoEntry } from "./types";
import { getWindowStrength, getZoomState } from "./windows";
import type { TimeWindow, Zoom } from "./windows";

const MODE_GLIDE = 0.6;
const CARD = { x: 56, y: 56, w: 580, h: 968 };
const BUBBLE_MARGIN = 48;
const CAPTION_CENTER: Record<Mode, number> = { head: WIDTH / 2, split: STAGE.left + STAGE.width / 2, screen: WIDTH / 2 };

type Box = { x: number; y: number; w: number; h: number };

export type Resolved = {
  def: VideoDef;
  clock: Clock;
  modes: { at: number; mode: Mode }[];
  graphics: { from: number; frames: number; start: number; component: React.FC }[];
  bubbleHidden: TimeWindow[];
  zooms: Zoom[];
  labels: Label[];
  endFrames: number;
  frames: number;
};

export const resolve = (def: VideoDef): Resolved => {
  const clock = makeClock(def.keep);
  const { o } = clock;
  if (!def.webcam && !def.display) throw new Error(`${def.id}: needs a webcam file, a display file, or both`);
  if (def.modes.length === 0) throw new Error(`${def.id}: modes needs at least one entry`);
  for (const entry of def.modes) {
    if (entry.mode !== "screen" && !def.webcam) throw new Error(`${def.id}: mode "${entry.mode}" needs a webcam file`);
    if (entry.mode === "screen" && !def.display) throw new Error(`${def.id}: mode "screen" needs a display file`);
  }
  const span = (from: number, to: number): TimeWindow => ({ from: o(from), duration: o(to) - o(from) });
  const endFrames = def.endCard ? Math.round((def.endCard.seconds ?? 4) * FPS) : 0;
  const modes = def.modes.map((entry, index) => ({ at: index === 0 ? 0 : o(entry.at), mode: entry.mode }));
  const leavesSplit = modes.filter((entry, index) => modes[index - 1]?.mode === "split" && entry.mode !== "split");
  return {
    def,
    clock,
    modes,
    graphics: (def.graphics ?? []).map((graphic) => {
      const from = Math.round(o(graphic.from) * FPS);
      const to = Math.round(o(graphic.to) * FPS);
      // A graphic that ends where the video leaves split stays for the glide,
      // so the stage is not empty while the speaker card moves away.
      const glide = leavesSplit.some((entry) => Math.abs(Math.round(entry.at * FPS) - to) <= 1) ? Math.round(MODE_GLIDE * FPS) : 0;
      return { from, frames: Math.min(to + glide, clock.takeFrames) - from, start: graphic.from, component: graphic.component };
    }),
    bubbleHidden: (def.bubbleHidden ?? []).map(([from, to]) => span(from, to)),
    zooms: (def.zooms ?? []).map((zoom) => ({ ...span(zoom.from, zoom.to), x: zoom.x, y: zoom.y, scale: zoom.scale ?? 1.7 })),
    labels: (def.labels ?? []).map((label) => ({
      from: o(label.at),
      duration: label.duration ?? 5,
      kind: label.kind ?? "lower-third",
      title: label.title,
      subtitle: label.subtitle ?? null,
    })),
    endFrames,
    frames: clock.takeFrames + endFrames,
  };
};

const clampTo = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const headLayout = (def: VideoDef, style: Style): Record<Mode, { dest: Box; crop: Box; radius: number }> => {
  const face = { x: 0.5, y: 0.5, zoom: 0.63, ...def.face };
  const slice = (HEIGHT * CARD.w) / CARD.h;
  const side = HEIGHT * face.zoom;
  const size = style.bubble.size;
  return {
    head: { dest: { x: 0, y: 0, w: WIDTH, h: HEIGHT }, crop: { x: 0, y: 0, w: WIDTH, h: HEIGHT }, radius: 0 },
    split: {
      dest: CARD,
      crop: { x: clampTo(face.x * WIDTH - slice / 2, 0, WIDTH - slice), y: 0, w: slice, h: HEIGHT },
      radius: style.card.radius,
    },
    screen: {
      dest: {
        x: style.bubble.corner === "bottom-left" ? BUBBLE_MARGIN : WIDTH - BUBBLE_MARGIN - size,
        y: HEIGHT - BUBBLE_MARGIN - size,
        w: size,
        h: size,
      },
      crop: {
        x: clampTo(face.x * WIDTH - side / 2, 0, WIDTH - side),
        y: clampTo(face.y * HEIGHT - side / 2, 0, HEIGHT - side),
        w: side,
        h: side,
      },
      radius: size / 2,
    },
  };
};

const mixBox = (a: Box, b: Box, p: number): Box => ({
  x: mix(a.x, b.x, p),
  y: mix(a.y, b.y, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
});

const useModes = (modes: Resolved["modes"]) => {
  const t = useCurrentFrame() / FPS;
  const index = Math.max(0, modes.findLastIndex((entry) => t >= entry.at));
  const current = modes[index]?.mode ?? "head";
  const previous = modes[index - 1]?.mode ?? current;
  const at = modes[index]?.at ?? 0;
  const p =
    index === 0
      ? 1
      : interpolate(t, [at, at + MODE_GLIDE], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.cubic),
        });
  const weight = (mode: Mode) => (current === mode ? p : 0) + (previous === mode ? 1 - p : 0);
  return { current, previous, p, weight };
};

// One file played through the cut: a clip per kept range.
const Take: React.FC<{ video: Resolved; src: string; offset: number; style: React.CSSProperties }> = ({
  video,
  src,
  offset,
  style,
}) => (
  <>
    {video.clock.segments.map((segment) => (
      <Sequence key={segment.from} from={segment.from} durationInFrames={segment.frames} layout="none">
        <OffthreadVideo src={staticFile(src)} trimBefore={Math.max(0, segment.srcFrom - offset)} muted style={style} />
      </Sequence>
    ))}
  </>
);

const displayOffset = (def: VideoDef) => Math.round((def.displayOffset ?? 0) * FPS);

const Screen: React.FC<{ video: Resolved; opacity: number }> = ({ video, opacity }) => {
  const frame = useCurrentFrame();
  const zoom = getZoomState(frame, FPS, video.zooms);
  if (!video.def.display) return null;
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <Take
        video={video}
        src={video.def.display}
        offset={displayOffset(video.def)}
        style={{
          position: "absolute",
          width: WIDTH,
          height: HEIGHT,
          objectFit: "contain",
          transform: `scale(${zoom.scale})`,
          transformOrigin: `${zoom.originX * 100}% ${zoom.originY * 100}%`,
        }}
      />
    </AbsoluteFill>
  );
};

const fade = (color: string, amount: number) => `color-mix(in srgb, ${color} ${Math.round(amount * 100)}%, transparent)`;

const Head: React.FC<{ video: Resolved; from: Mode; to: Mode; p: number; card: number; bubble: number }> = ({
  video,
  from,
  to,
  p,
  card,
  bubble,
}) => {
  const style = useStyle();
  const frame = useCurrentFrame();
  if (!video.def.webcam) return null;
  const layout = headLayout(video.def, style);
  const dest = mixBox(layout[from].dest, layout[to].dest, p);
  const crop = mixBox(layout[from].crop, layout[to].crop, p);
  const radius = mix(layout[from].radius, layout[to].radius, p);
  const kx = dest.w / crop.w;
  const ky = dest.h / crop.h;
  const shown = 1 - bubble * getWindowStrength(frame, FPS, video.bubbleHidden);
  if (shown === 0) return null;
  const { colors } = style;
  return (
    <div
      style={{
        position: "absolute",
        left: dest.x,
        top: dest.y,
        width: dest.w,
        height: dest.h,
        borderRadius: radius,
        overflow: "hidden",
        opacity: shown,
        scale: String(mix(0.86, 1, shown)),
        boxShadow: [
          style.card.shadow === "hard" ? `${12 * card}px ${12 * card}px 0 ${fade(colors.accent, card)}` : null,
          style.card.shadow === "soft" ? `0 18px 50px rgba(15, 23, 42, ${0.2 * card})` : null,
          style.card.border > 0 ? `0 0 0 ${style.card.border * card}px ${fade(colors.ink, card)}` : null,
          `0 18px 45px rgba(15, 23, 42, ${0.25 * bubble})`,
          `0 0 0 ${5 * bubble}px ${fade(colors.surface, bubble)}`,
        ]
          .filter(Boolean)
          .join(", "),
      }}
    >
      <Take
        video={video}
        src={video.def.webcam}
        offset={0}
        style={{
          position: "absolute",
          left: -crop.x * kx,
          top: -crop.y * ky,
          width: WIDTH * kx,
          height: HEIGHT * ky,
          maxWidth: "none",
        }}
      />
    </div>
  );
};

const Stage: React.FC<{ video: Resolved; opacity: number }> = ({ video, opacity }) => (
  <div style={{ position: "absolute", ...STAGE, opacity }}>
    {video.graphics.map((graphic, index) => {
      const Graphic = graphic.component;
      const start = video.clock.o(graphic.start);
      return (
        <Sequence key={index} from={graphic.from} durationInFrames={graphic.frames} layout="none">
          <GraphicContext.Provider value={{ cue: (src) => video.clock.o(src) - start, frames: graphic.frames }}>
            <Graphic />
          </GraphicContext.Provider>
        </Sequence>
      );
    })}
  </div>
);

const EndCard: React.FC<{ kicker?: string; headline: string }> = ({ kicker, headline }) => {
  const style = useStyle();
  const t = useT();
  const cover = interpolate(useCurrentFrame(), [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const text = pop(t, 0.35, 0.5);
  const brand = pop(t, 0.7, 0.5);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: style.colors.background,
        color: style.colors.ink,
        opacity: cover,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 160px",
      }}
    >
      {kicker ? (
        <Tag color={style.colors.accent} style={{ fontSize: 30, opacity: text }}>
          {kicker}
        </Tag>
      ) : null}
      <div
        style={{
          ...font(style.fonts.title),
          fontSize: 116,
          lineHeight: 1.08,
          marginTop: 22,
          opacity: text,
          translate: `0px ${(1 - text) * 24}px`,
        }}
      >
        {headline}
      </div>
      {style.brand.logo ? (
        <Img src={staticFile(style.brand.logo)} style={{ width: style.brand.logoWidth, marginTop: 84, opacity: brand }} />
      ) : null}
      {style.brand.line ? (
        <div style={{ ...font(style.fonts.label), textTransform: "none", fontSize: 30, marginTop: 26, opacity: brand }}>
          {style.brand.line}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Body: React.FC<{ video: Resolved }> = ({ video }) => {
  const style = useStyle();
  const { def, clock } = video;
  const { current, previous, p, weight } = useModes(video.modes);
  const screen = weight("screen");
  const split = weight("split");
  const voice = def.webcam ?? def.display;
  const voiceOffset = def.webcam ? 0 : displayOffset(def);
  return (
    <AbsoluteFill style={{ backgroundColor: style.colors.background }}>
      {voice
        ? clock.segments.map((segment) => (
            <Sequence key={segment.from} from={segment.from} durationInFrames={segment.frames} layout="none">
              <Audio src={staticFile(voice)} trimBefore={Math.max(0, segment.srcFrom - voiceOffset)} />
            </Sequence>
          ))
        : null}
      <Sequence durationInFrames={clock.takeFrames} layout="none">
        {split > 0 ? <Stage video={video} opacity={split} /> : null}
        {screen > 0 ? <Screen video={video} opacity={screen} /> : null}
        <Head video={video} from={previous} to={current} p={p} card={split} bubble={screen} />
        <Labels labels={video.labels} />
        {style.captions.show ? (
          <Captions words={def.words} clock={clock} centerX={mix(CAPTION_CENTER[previous], CAPTION_CENTER[current], p)} />
        ) : null}
      </Sequence>
      {def.endCard ? (
        <Sequence from={Math.max(0, clock.takeFrames - 10)} durationInFrames={video.endFrames + 10} name="End card">
          <EndCard kicker={def.endCard.kicker} headline={def.endCard.headline} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

export const Video: React.FC<{ video: Resolved; style?: Style }> = ({ video, style }) => {
  const inherited = useStyle();
  return (
    <StyleContext.Provider value={style ?? video.def.style ?? inherited}>
      <Body video={video} />
    </StyleContext.Provider>
  );
};

export const defineVideo = (def: VideoDef): VideoEntry => {
  const video = resolve(def);
  return { id: def.id, frames: video.frames, def, Component: () => <Video video={video} /> };
};
