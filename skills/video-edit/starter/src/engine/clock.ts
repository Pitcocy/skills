export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export type Segment = { srcFrom: number; from: number; frames: number };

export type Clock = {
  segments: Segment[];
  takeFrames: number;
  // Source second -> second in the finished video. A time inside a dropped
  // stretch lands on the cut.
  o: (src: number) => number;
  srcAt: (frame: number) => number;
  isKept: (src: number) => boolean;
};

export const makeClock = (keep: number[][]): Clock => {
  const ranges = keep.map((range, index) => {
    const [start, end] = range;
    if (start === undefined || end === undefined || end <= start) {
      throw new Error(`keep[${index}] must be [start, end] in source seconds with end after start`);
    }
    const previous = keep[index - 1]?.[1];
    if (previous !== undefined && start < previous) {
      throw new Error(`keep[${index}] starts before keep[${index - 1}] ends`);
    }
    return [start, end] as const;
  });
  if (ranges.length === 0) throw new Error("keep needs at least one [start, end] range");

  const segments = ranges.reduce<Segment[]>((list, [start, end]) => {
    const previous = list.at(-1);
    const srcFrom = Math.round(start * FPS);
    list.push({
      srcFrom,
      from: previous ? previous.from + previous.frames : 0,
      frames: Math.round(end * FPS) - srcFrom,
    });
    return list;
  }, []);

  const takeFrames = segments.reduce((total, segment) => total + segment.frames, 0);

  const o = (src: number) => {
    const srcFrame = src * FPS;
    let out = 0;
    for (const segment of segments) {
      if (srcFrame < segment.srcFrom) return out / FPS;
      if (srcFrame < segment.srcFrom + segment.frames) return (segment.from + srcFrame - segment.srcFrom) / FPS;
      out = segment.from + segment.frames;
    }
    return out / FPS;
  };

  const srcAt = (frame: number) => {
    const segment = segments.findLast((candidate) => frame >= candidate.from) ?? segments[0];
    if (!segment) return 0;
    return (segment.srcFrom + Math.min(frame - segment.from, segment.frames - 1)) / FPS;
  };

  const isKept = (src: number) => ranges.some(([start, end]) => src >= start && src < end);

  return { segments, takeFrames, o, srcAt, isKept };
};
