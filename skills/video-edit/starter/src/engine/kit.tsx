import React from "react";
import { Easing, Freeze, interpolate, Sequence, useCurrentFrame } from "remotion";
import { FPS } from "./clock";
import { cardLook, font, useStyle } from "./style-context";

// The area a graphic draws in while the speaker sits in the card on the left.
export const STAGE = { left: 720, top: 56, width: 1144, height: 780 };
export const BOARD_BODY = { width: 1144, height: 584 };

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Seconds since the graphic came on.
export const useT = () => useCurrentFrame() / FPS;

export const pop = (t: number, at: number, dur = 0.4) =>
  interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });

export const ramp = (t: number, from: number, to: number) => interpolate(t, [from, to], [0, 1], clamp);

export const glide = (t: number, from: number, to: number) =>
  interpolate(t, [from, to], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

export const abs = (left: number, top: number, width?: number, height?: number): React.CSSProperties => ({
  position: "absolute",
  left,
  top,
  width,
  height,
});

export const GraphicContext = React.createContext<{ cue: (src: number) => number; frames: number }>({
  cue: (src) => src,
  frames: Infinity,
});

// Source second -> second on the clock of the graphic it is called in, so an
// element can land on the word that names it: <In at={c(118.2)}>.
export const useCue = () => React.useContext(GraphicContext).cue;

export const useFonts = () => {
  const style = useStyle();
  return { title: font(style.fonts.title), body: font(style.fonts.body), label: font(style.fonts.label) };
};

export const In: React.FC<{
  at: number;
  dx?: number;
  dy?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ at, dx = 0, dy = 26, style, children }) => {
  const p = pop(useT(), at);
  return <div style={{ opacity: p, translate: `${(1 - p) * dx}px ${(1 - p) * dy}px`, ...style }}>{children}</div>;
};

export const Card: React.FC<{
  tone?: "plain" | "accent" | "second";
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ tone = "plain", style, children }) => {
  const look = useStyle();
  const toneColor = tone === "accent" ? look.colors.accent : tone === "second" ? look.colors.second : undefined;
  return (
    <div
      style={{
        ...cardLook(look, toneColor),
        ...font(look.fonts.body),
        color: look.colors.ink,
        boxSizing: "border-box",
        padding: "22px 26px",
        borderLeft: toneColor && look.card.shadow !== "hard" ? `10px solid ${toneColor}` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Tag: React.FC<{ color?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  color,
  style,
  children,
}) => {
  const look = useStyle();
  return <div style={{ ...font(look.fonts.label), fontSize: 24, color: color ?? look.colors.muted, ...style }}>{children}</div>;
};

const wipe = (image: string, p: number): React.CSSProperties => ({
  backgroundImage: image,
  backgroundRepeat: "no-repeat",
  backgroundSize: `${p * 100}% 100%`,
  WebkitBoxDecorationBreak: "clone",
  boxDecorationBreak: "clone",
});

// The accent block that wipes in behind a word of a headline.
export const Hl: React.FC<{ at?: number; children?: React.ReactNode }> = ({ at = 0.3, children }) => {
  const look = useStyle();
  const p = pop(useT(), at, 0.5);
  return (
    <span
      style={{
        ...wipe(`linear-gradient(${look.colors.accent}, ${look.colors.accent})`, p),
        color: p > 0.4 ? look.colors.accentText : undefined,
        padding: "0 14px",
        borderRadius: Math.min(look.card.radius, 12),
      }}
    >
      {children}
    </span>
  );
};

// Marker over running text: a highlight, or a strike through every line.
export const Mark: React.FC<{ p: number; color?: string; strike?: boolean; children?: React.ReactNode }> = ({
  p,
  color,
  strike = false,
  children,
}) => {
  const look = useStyle();
  const paint = color ?? look.colors.second;
  return (
    <span
      style={{
        ...wipe(
          strike
            ? `linear-gradient(transparent 46%, ${paint} 46%, ${paint} 60%, transparent 60%)`
            : `linear-gradient(${paint}, ${paint})`,
          p,
        ),
        color: strike && p > 0.5 ? look.colors.muted : undefined,
      }}
    >
      {children}
    </span>
  );
};

// Placeholder text lines. reveal 0..1 writes them one after another.
export const Lines: React.FC<{
  widths: number[];
  color?: string;
  h?: number;
  gap?: number;
  reveal?: number;
  style?: React.CSSProperties;
}> = ({ widths, color, h = 14, gap = 16, reveal = 1, style }) => {
  const look = useStyle();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {widths.map((width, i) => {
        const p = Math.min(1, Math.max(0, reveal * widths.length - i));
        return <div key={i} style={{ height: h, width: `${width * p}%`, background: color ?? look.colors.muted, borderRadius: h / 2 }} />;
      })}
    </div>
  );
};

export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; color?: string }> = ({
  x1,
  y1,
  x2,
  y2,
  p,
  color,
}) => {
  const look = useStyle();
  const x = mix(x1, x2, p);
  const y = mix(y1, y2, p);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const paint = color ?? look.colors.ink;
  return (
    <svg
      width={BOARD_BODY.width}
      height={BOARD_BODY.height}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: p > 0 ? 1 : 0 }}
    >
      <line x1={x1} y1={y1} x2={x} y2={y} stroke={paint} strokeWidth={5} />
      <polygon points="0,-12 20,0 0,12" fill={paint} transform={`translate(${x} ${y}) rotate(${angle})`} />
    </svg>
  );
};

export const Check: React.FC<{ size?: number; color?: string }> = ({ size = 34, color }) => {
  const look = useStyle();
  return (
    <svg viewBox="0 0 30 30" width={size} height={size} style={{ flexShrink: 0 }}>
      <rect width={30} height={30} rx={Math.min(look.card.radius, 8)} fill={color ?? look.colors.accent} />
      <polyline points="7,16 13,22 23,9" fill="none" stroke={look.colors.accentText} strokeWidth={4} />
    </svg>
  );
};

// A small numbered box that can flip to done.
export const Tile: React.FC<{ label: string; at: number; doneAt?: number; w?: number; h?: number }> = ({
  label,
  at,
  doneAt,
  w = 60,
  h = 60,
}) => {
  const look = useStyle();
  const t = useT();
  const p = pop(t, at, 0.3);
  const done = doneAt === undefined ? 0 : pop(t, doneAt, 0.25);
  return (
    <div
      style={{
        ...font(look.fonts.label),
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `3px solid ${done > 0.5 ? look.colors.accent : look.colors.ink}`,
        borderRadius: Math.min(look.card.radius, 12),
        background: done > 0.5 ? look.colors.accent : look.colors.surface,
        color: done > 0.5 ? look.colors.accentText : look.colors.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(h * 0.38),
        opacity: p,
        scale: String(0.6 + 0.4 * p + 0.12 * Math.sin(Math.PI * done)),
      }}
    >
      {label}
    </div>
  );
};

export const Type: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const look = useStyle();
  const p = ramp(useT(), from, to);
  const shown = Math.round(text.length * p);
  return (
    <>
      <span style={{ borderRight: `4px solid ${p > 0 && p < 1 ? look.colors.ink : "transparent"}` }}>{text.slice(0, shown)}</span>
      <span style={{ opacity: 0 }}>{text.slice(shown)}</span>
    </>
  );
};

// A verdict that lands on top of the graphic, slightly rotated.
export const Stamp: React.FC<{
  at: number;
  rotate?: number;
  size?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ at, rotate = -4, size = 32, style, children }) => {
  const look = useStyle();
  const p = interpolate(useT(), [at, at + 0.22], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 1.4, 0.4, 1) });
  return (
    <div
      style={{
        ...font(look.fonts.title),
        fontSize: size,
        lineHeight: 1,
        background: look.colors.accent,
        color: look.colors.accentText,
        borderRadius: Math.min(look.card.radius, 10),
        padding: "10px 16px",
        position: "absolute",
        whiteSpace: "nowrap",
        opacity: Math.min(1, p * 2),
        rotate: `${rotate}deg`,
        scale: String(1.6 - 0.6 * p),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Shifts the clock for children whose animation starts at second 0.
const Delay: React.FC<{ by: number; children: React.ReactNode }> = ({ by, children }) => {
  const frame = useCurrentFrame();
  const frames = Math.round(by * FPS);
  if (frame < frames) return <Freeze frame={0}>{children}</Freeze>;
  return (
    <Sequence from={frames} layout="none">
      {children}
    </Sequence>
  );
};

// The frame of one graphic: a small kicker, a headline, and a body of
// 1144 x 584 px for the drawing itself.
export const Board: React.FC<{
  kicker: string;
  headline: React.ReactNode;
  headAt?: number;
  children?: React.ReactNode;
}> = ({ kicker, headline, headAt = 0.1, children }) => {
  const look = useStyle();
  const frame = useCurrentFrame();
  const { frames } = React.useContext(GraphicContext);
  const visible = Math.min(ramp(frame, 0, 6), Number.isFinite(frames) ? 1 - ramp(frame, frames - 6, frames) : 1);
  const head = pop(frame / FPS, headAt, 0.5);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: visible, color: look.colors.ink }}>
      <Tag color={look.colors.accent} style={{ position: "absolute", left: 0, top: 6, fontSize: 26 }}>
        {kicker}
      </Tag>
      <div
        style={{
          ...font(look.fonts.title),
          position: "absolute",
          left: 0,
          top: 50,
          fontSize: 88,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          opacity: head,
          translate: `0px ${(1 - head) * 22}px`,
        }}
      >
        <Delay by={headAt}>{headline}</Delay>
      </div>
      <div style={{ position: "absolute", left: 0, top: 196, ...BOARD_BODY }}>{children}</div>
    </div>
  );
};
