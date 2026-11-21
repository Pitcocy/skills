import { interpolate } from "remotion";

// Timed effects are resolved into a 0..1 strength for the current frame, so
// every effect eases in and out the same way.
export type TimeWindow = { from: number; duration: number };
export type Zoom = TimeWindow & { x: number; y: number; scale: number };

export const WINDOW_FADE_FRAMES = 9;
export const ZOOM_RAMP_FRAMES = 20;

const windowProgress = (frame: number, fps: number, window: TimeWindow, rampFrames: number): number => {
  const start = window.from * fps;
  const end = start + window.duration * fps;

  // A window shorter than two ramps peaks and returns. The ramp stays just
  // under half the length: at exactly half the two middle stops collide and
  // interpolate rejects the range.
  const ramp = Math.min(rampFrames, (end - start) / 2 - 0.5);
  if (ramp <= 0 || frame < start || frame > end) return 0;

  return interpolate(frame, [start, start + ramp, end - ramp, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// Overlapping windows do not stack, the strongest one wins.
export const getWindowStrength = (frame: number, fps: number, windows: TimeWindow[], rampFrames = WINDOW_FADE_FRAMES) =>
  windows.reduce((strongest, window) => Math.max(strongest, windowProgress(frame, fps, window, rampFrames)), 0);

export type ZoomState = { scale: number; originX: number; originY: number };

// Turns "put this point in the middle" into a CSS transform origin. A point p
// ends up at origin + (p - origin) * scale; solving for p landing on 0.5 gives
// the origin. The target is clamped first so the zoomed frame never runs past
// the edge of the recording: a corner target pins to that corner.
const originForTarget = (target: number, scale: number): number => {
  if (scale <= 1) return 0.5;
  const halfViewport = 0.5 / scale;
  const clamped = Math.min(Math.max(target, halfViewport), 1 - halfViewport);
  return (0.5 - clamped * scale) / (1 - scale);
};

export const getZoomState = (frame: number, fps: number, zooms: Zoom[]): ZoomState => {
  let winner: { zoom: Zoom; strength: number } | null = null;
  for (const zoom of zooms) {
    const strength = windowProgress(frame, fps, zoom, ZOOM_RAMP_FRAMES);
    if (strength > 0 && (winner === null || strength > winner.strength)) winner = { zoom, strength };
  }
  if (winner === null) return { scale: 1, originX: 0.5, originY: 0.5 };

  // The origin follows the ramped scale, otherwise the frame slides sideways
  // while it zooms in.
  const scale = 1 + (winner.zoom.scale - 1) * winner.strength;
  return { scale, originX: originForTarget(winner.zoom.x, scale), originY: originForTarget(winner.zoom.y, scale) };
};
