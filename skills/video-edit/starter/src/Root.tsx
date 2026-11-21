import React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./engine";
import { STYLE_SHEET_HEIGHT, StyleSheet } from "./engine/StyleSheet";
import { VIDEOS } from "./videos";

export const Root: React.FC = () => (
  <>
    {VIDEOS.map((video) => (
      <Composition
        key={video.id}
        id={video.id}
        component={video.Component}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={video.frames}
      />
    ))}
    <Composition
      id="style-sheet"
      component={StyleSheet}
      width={WIDTH}
      height={STYLE_SHEET_HEIGHT}
      fps={FPS}
      durationInFrames={1}
    />
  </>
);
