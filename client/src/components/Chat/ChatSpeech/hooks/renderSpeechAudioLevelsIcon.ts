import { createHiPPICanvas } from "src/dashboard/Charts/createHiPPICanvas";
import {
  drawShapes,
  type ShapeV2,
} from "src/dashboard/Charts/drawShapes/drawShapes";

const BAR_COUNT = 5;
const BAR_SPACING = 4;
const X_PADDING = 4;

export const renderSpeechAudioLevelsIcon = (
  canvas: HTMLCanvasElement,
  recentLevels: number[],
  levelThreshold: number,
  isSpeaking: boolean,
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const { width: w, height: h } = canvas.parentElement!.getBoundingClientRect();
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  createHiPPICanvas(canvas, w, h);

  const netWidth = w - X_PADDING * 2 - (BAR_COUNT - 1) * BAR_SPACING;
  const barWidth = Math.floor(netWidth / BAR_COUNT);

  const barPositionRatio = {
    0: -0.25,
    1: +0.25,
    2: +0.5,
    3: +0.25,
    4: -0.25,
  };

  drawShapes(
    [
      {
        id: "background",
        type: "rectangle" as const,
        coords: [0, 0],
        w: ctx.canvas.width,
        h: ctx.canvas.height,
        fillStyle:
          !isSpeaking ? "transparent" : (
            getComputedStyle(document.documentElement).getPropertyValue(
              "--faded-blue",
            )
          ),
        lineWidth: 0,
        strokeStyle: "rgba(0,0,0,0)",
      },
      ...recentLevels.map((_audioLevel, index) => {
        const audioLevel = isSpeaking ? _audioLevel : _audioLevel * 0.3;
        const max = levelThreshold * 5;
        const levelHeight = Math.min(
          h,
          (audioLevel / max) * h + barPositionRatio[index] * h,
        );
        const edgeDiff = (h - levelHeight) / 2;
        const x = X_PADDING + index * (barWidth + BAR_SPACING);
        return {
          id: `level-${index}`,
          type: "rectangle" as const,
          coords: [x, edgeDiff],
          h: levelHeight,
          w: barWidth,
          borderRadius: 2,
          fillStyle: getComputedStyle(
            document.documentElement,
          ).getPropertyValue(isSpeaking ? "--blue" : "--gray"),
          lineWidth: 0,
          strokeStyle: "rgba(0,0,0,0)",
        } satisfies ShapeV2;
      }),
    ],
    canvas,
  );
};
