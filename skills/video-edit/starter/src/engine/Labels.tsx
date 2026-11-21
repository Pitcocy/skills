import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CAPTION_BAND_HEIGHT, CAPTION_BOTTOM } from "./Captions";
import { FPS } from "./clock";
import { font, useStyle } from "./style-context";
import { getWindowStrength } from "./windows";
import type { TimeWindow } from "./windows";

// Text drawn on top of the running video. The recording keeps playing
// underneath, so a point can be named without leaving what is being shown.
export type Label = TimeWindow & {
  kind: "lower-third" | "banner" | "callout";
  title: string;
  subtitle: string | null;
};

const SingleLabel: React.FC<{ label: Label }> = ({ label }) => {
  const style = useStyle();
  const strength = getWindowStrength(useCurrentFrame(), FPS, [label]);
  if (strength === 0) return null;

  const { colors } = style;
  const body = { ...font(style.fonts.body), textTransform: "none" } as const;
  const surface: React.CSSProperties = {
    backgroundColor: colors.captionSurface,
    color: colors.captionText,
    boxShadow: "0 22px 60px rgba(15, 23, 42, 0.3)",
    opacity: strength,
  };
  const muted = `color-mix(in srgb, ${colors.captionText} 65%, transparent)`;

  if (label.kind === "lower-third") {
    // Opposite the bubble, directly above the caption band.
    const side = style.bubble.corner === "bottom-left" ? "right" : "left";
    const slide = interpolate(strength, [0, 1], [70, 0]) * (side === "right" ? 1 : -1);
    return (
      <div
        style={{
          position: "absolute",
          bottom: CAPTION_BOTTOM + CAPTION_BAND_HEIGHT + 20,
          [side]: 72,
          transform: `translateX(${slide}px)`,
          ...surface,
          borderRadius: Math.min(style.card.radius, 18),
          borderLeft: `8px solid ${colors.captionHighlight}`,
          padding: "22px 38px 24px 30px",
          maxWidth: 780,
        }}
      >
        <div style={{ ...body, fontSize: 42 }}>{label.title}</div>
        {label.subtitle ? (
          <div style={{ ...body, fontWeight: 400, fontSize: 28, marginTop: 8, color: muted }}>{label.subtitle}</div>
        ) : null}
      </div>
    );
  }

  if (label.kind === "banner") {
    return (
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${interpolate(strength, [0, 1], [-40, 0])}px)`,
        }}
      >
        <div style={{ ...surface, ...font(style.fonts.label), fontSize: 34, borderRadius: 999, padding: "14px 40px" }}>
          {label.title}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          ...surface,
          transform: `scale(${interpolate(strength, [0, 1], [0.94, 1])})`,
          borderRadius: Math.min(style.card.radius, 24),
          padding: "48px 68px",
          maxWidth: 1240,
          textAlign: "center",
        }}
      >
        <div style={{ ...font(style.fonts.title), fontSize: 86, lineHeight: 1.05 }}>{label.title}</div>
        {label.subtitle ? (
          <div style={{ ...body, fontWeight: 400, fontSize: 36, marginTop: 20, color: muted }}>{label.subtitle}</div>
        ) : null}
      </div>
    </div>
  );
};

export const Labels: React.FC<{ labels: Label[] }> = ({ labels }) => (
  <>
    {labels.map((label, index) => (
      <SingleLabel key={index} label={label} />
    ))}
  </>
);
