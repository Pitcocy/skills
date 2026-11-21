import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import type { Style } from "./engine/types";

const inter = loadInter("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] }).fontFamily;

// The look of every video in this project. The video-style skill rewrites
// this file; the engine reads nothing else for colours, fonts and shapes.
export const STYLE: Style = {
  name: "Clean",
  colors: {
    background: "#F4F6FA",
    surface: "#FFFFFF",
    ink: "#0F172A",
    muted: "#64748B",
    accent: "#2563EB",
    accentText: "#FFFFFF",
    second: "#F59E0B",
    captionSurface: "rgba(15, 23, 42, 0.94)",
    captionText: "#FFFFFF",
    captionHighlight: "#FBBF24",
  },
  fonts: {
    title: { family: inter, weight: 800, letterSpacing: "-0.02em" },
    body: { family: inter, weight: 700 },
    label: { family: inter, weight: 700, uppercase: true, letterSpacing: "0.08em" },
  },
  card: { border: 0, radius: 22, shadow: "soft" },
  captions: { show: true, fontSize: 44, maxChars: 44, radius: 18 },
  bubble: { size: 260, corner: "bottom-left" },
  brand: { logo: null, logoWidth: 320, line: null },
};
