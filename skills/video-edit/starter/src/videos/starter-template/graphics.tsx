import React from "react";
import { abs, Arrow, Board, Card, Hl, In, pop, Tag, useCue, useFonts, useT } from "../../engine";

// One component per idea. c() turns a second of the source recording into
// the clock of this graphic, so every element lands on the word that names it.
// This one is an example: it is not on the timeline until video.tsx lists it
// under graphics with its { from, to }.
export const ExampleGraphic: React.FC = () => {
  const t = useT();
  const c = useCue();
  const fonts = useFonts();
  return (
    <Board kicker="The short version" headline={<>Two kinds of <Hl>tasks</Hl></>} headAt={c(12.4)}>
      <In at={c(14.1)} style={abs(0, 0, 520)}>
        <Card tone="accent" style={{ height: 160 }}>
          <Tag>Type 1</Tag>
          <div style={{ ...fonts.title, fontSize: 60, marginTop: 10 }}>Small task</div>
        </Card>
      </In>
      <Arrow x1={540} y1={80} x2={596} y2={80} p={pop(t, c(15.6), 0.25)} />
      <In at={c(15.8)} style={abs(620, 0, 520)}>
        <Card style={{ height: 160 }}>
          <Tag>Type 2</Tag>
          <div style={{ ...fonts.title, fontSize: 60, marginTop: 10 }}>Bigger task</div>
        </Card>
      </In>
    </Board>
  );
};
