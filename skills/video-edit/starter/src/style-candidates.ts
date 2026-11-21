import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import type { Style } from "./engine/types";
import { STYLE } from "./style";

const grotesk = loadSpaceGrotesk("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;
const fraunces = loadFraunces("normal", { weights: ["600"], subsets: ["latin", "latin-ext"] }).fontFamily;

const NIGHT: Style = {
  ...STYLE,
  name: "Night",
  colors: {
    background: "#0B0F17",
    surface: "#161C28",
    ink: "#F1F5F9",
    muted: "#8B97AB",
    accent: "#A3E635",
    accentText: "#0B0F17",
    second: "#38BDF8",
    captionSurface: "rgba(241, 245, 249, 0.96)",
    captionText: "#0B0F17",
    captionHighlight: "#4D7C0F",
  },
  fonts: {
    title: { family: grotesk, weight: 700, letterSpacing: "-0.02em" },
    body: { family: grotesk, weight: 500 },
    label: { family: grotesk, weight: 700, uppercase: true, letterSpacing: "0.1em" },
  },
  card: { border: 2, radius: 14, shadow: "none" },
};

const SOFT: Style = {
  ...STYLE,
  name: "Soft",
  colors: {
    background: "#F3EEFB",
    surface: "#FFFFFF",
    ink: "#2A2140",
    muted: "#7C7391",
    accent: "#7C3AED",
    accentText: "#FFFFFF",
    second: "#EC4899",
    captionSurface: "rgba(255, 255, 255, 0.97)",
    captionText: "#2A2140",
    captionHighlight: "#7C3AED",
  },
  fonts: { ...STYLE.fonts, title: { family: fraunces, weight: 600, letterSpacing: "-0.01em" } },
  card: { border: 0, radius: 36, shadow: "soft" },
  captions: { ...STYLE.captions, radius: 40 },
};

// The looks the style-sheet composition puts side by side. The video-style
// skill replaces this list every round.
export const CANDIDATES: Style[] = [STYLE, NIGHT, SOFT];
