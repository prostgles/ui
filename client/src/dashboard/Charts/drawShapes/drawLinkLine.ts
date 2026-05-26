import type { LinkLine } from "../CanvasChart";
import { type ShapeV2 } from "./drawShapes";
import { getLinkLines } from "./getLinkLinePoints";

export const getCtx = (canvas: HTMLCanvasElement) => {
  return canvas.getContext("2d");
};

export const drawLinkLine = (
  shapes: (ShapeV2 | LinkLine)[],
  ctx: CanvasRenderingContext2D,
  linkLine: LinkLine,
) => {
  const lines = getLinkLines(shapes, linkLine);
  if (!lines) return;
  lines.forEach(({ startPoint, endPoint, controlPoint1, controlPoint2 }) => {
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.bezierCurveTo(
      controlPoint1.x,
      controlPoint1.y,
      controlPoint2.x,
      controlPoint2.y,
      endPoint.x,
      endPoint.y,
    );
    ctx.stroke();
  });
};
