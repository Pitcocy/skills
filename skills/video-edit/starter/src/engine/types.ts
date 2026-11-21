import type React from "react";

export type Mode = "head" | "split" | "screen";

export type Word = { text: string; start: number; end: number };

export type Range = [number, number];

export type FontRole = {
  family: string;
  weight: number;
  uppercase?: boolean;
  letterSpacing?: string;
};

export type Style = {
  name: string;
  colors: {
    background: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    accentText: string;
    second: string;
    captionSurface: string;
    captionText: string;
    captionHighlight: string;
  };
  fonts: { title: FontRole; body: FontRole; label: FontRole };
  card: { border: number; radius: number; shadow: "soft" | "hard" | "none" };
  captions: { show: boolean; fontSize: number; maxChars: number; radius: number };
  bubble: { size: number; corner: "bottom-left" | "bottom-right" };
  brand: { logo: string | null; logoWidth: number; line: string | null };
};

// Every time in a video definition is a second in the source recording.
export type ZoomDef = { from: number; to: number; x: number; y: number; scale?: number };

export type LabelDef = {
  at: number;
  duration?: number;
  kind?: "lower-third" | "banner" | "callout";
  title: string;
  subtitle?: string;
};

export type GraphicDef = { from: number; to: number; component: React.FC };

export type VideoDef = {
  id: string;
  // Files under public/. The camera file carries the voice; without one the
  // voice comes from the screen file.
  webcam: string | null;
  display: string | null;
  // Seconds the screen file starts after the camera file.
  displayOffset?: number;
  keep: number[][];
  words: Word[];
  // Centre of the face in the camera frame, 0..1 from the top left. zoom is
  // the share of the frame height the bubble shows.
  face?: { x: number; y: number; zoom?: number };
  modes: { at: number; mode: Mode }[];
  graphics?: GraphicDef[];
  bubbleHidden?: Range[];
  zooms?: ZoomDef[];
  labels?: LabelDef[];
  endCard?: { kicker?: string; headline: string; seconds?: number } | null;
  style?: Style;
};

export type VideoEntry = { id: string; frames: number; def: VideoDef; Component: React.FC };
