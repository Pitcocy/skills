import React from "react";
import { useCurrentFrame } from "remotion";
import { FPS } from "./clock";
import type { Clock } from "./clock";
import { font, useStyle } from "./style-context";
import type { Word } from "./types";

export const CAPTION_BOTTOM = 74;
export const CAPTION_BAND_HEIGHT = 150;

const HOLD = 0.9;

type Page = { words: Word[]; from: number; to: number };

const toPages = (words: Word[], maxChars: number): Page[] => {
  const groups: Word[][] = [];
  let group: Word[] = [];
  let length = 0;
  for (const word of words) {
    group.push(word);
    length += word.text.length + 1;
    const sentenceEnd = /[.?!]$/.test(word.text);
    const softBreak = /,$/.test(word.text) && length > maxChars * 0.55;
    if (sentenceEnd || softBreak || length > maxChars) {
      groups.push(group);
      group = [];
      length = 0;
    }
  }
  if (group.length > 0) groups.push(group);

  // A page of one or two short words reads as a flicker, so it joins the page
  // before it when that page is still mid-sentence.
  const merged = groups.reduce<Word[][]>((list, next) => {
    const previous = list.at(-1);
    const first = next[0];
    const last = previous?.at(-1);
    const short = next.length <= 2 && next.map((word) => word.text).join(" ").length <= 14;
    if (previous && first && last && short && first.start - last.end < 0.5 && !/[.?!]$/.test(last.text)) {
      previous.push(...next);
    } else {
      list.push(next);
    }
    return list;
  }, []);

  return merged.flatMap((page, index) => {
    const first = page[0];
    const last = page.at(-1);
    if (!first || !last) return [];
    const next = merged[index + 1]?.[0];
    return [{ words: page, from: first.start - 0.08, to: Math.min(next ? next.start - 0.08 : Infinity, last.end + HOLD) }];
  });
};

export const Captions: React.FC<{ words: Word[]; clock: Clock; centerX: number }> = ({ words, clock, centerX }) => {
  const style = useStyle();
  const frame = useCurrentFrame();
  const pages = React.useMemo(
    () => toPages(words.filter((word) => clock.isKept(word.end)), style.captions.maxChars),
    [words, clock, style.captions.maxChars],
  );
  const now = clock.srcAt(frame) + 0.5 / FPS;
  const page = pages.find((candidate) => now >= candidate.from && now < candidate.to);
  if (!page) return null;
  const current = page.words.findLastIndex((word) => now >= word.start);
  return (
    <div
      style={{
        position: "absolute",
        bottom: CAPTION_BOTTOM,
        left: centerX - 540,
        width: 1080,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      <div
        style={{
          ...font(style.fonts.body),
          textTransform: "none",
          backgroundColor: style.colors.captionSurface,
          color: style.colors.captionText,
          fontSize: style.captions.fontSize,
          lineHeight: 1.3,
          textAlign: "center",
          textWrap: "balance",
          padding: "16px 34px",
          borderRadius: style.captions.radius,
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.28)",
        }}
      >
        {page.words.map((word, index) => (
          <span key={index} style={{ color: index === current ? style.colors.captionHighlight : undefined }}>
            {word.text}{" "}
          </span>
        ))}
      </div>
    </div>
  );
};
