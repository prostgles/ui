import type { LinkLine, Rectangle } from "../CanvasChart";
import { type ShapeV2 } from "./drawShapes";

export const getCtx = (canvas: HTMLCanvasElement) => {
  return canvas.getContext("2d");
};

/**
 * How much horizontal offset for control points (adjust for more/less curve)
 *  */
const controlPointFactor = 0.4;

export const drawLinkLine = (
  shapes: (ShapeV2 | LinkLine)[],
  ctx: CanvasRenderingContext2D,
  linkLine: LinkLine,
) => {
  const { sourceId, targetId, sourceYOffset, targetYOffset } = linkLine;
  const r1 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === sourceId,
  );
  const r2 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === targetId,
  );
  if (!r1 || !r2) return;
  const [x1, y1] = r1.coords;
  const [x2, y2] = r2.coords;

  const startP = [x1 + r1.w, y1 + sourceYOffset] as const;
  const endP = [x2, y2 + targetYOffset] as const;
  const startPoint = {
    x: startP[0],
    y: startP[1],
  };
  const endPoint = {
    x: endP[0],
    y: endP[1],
  };

  const dx = endPoint.x - startPoint.x;
  const horizontalOffset = Math.abs(dx) * controlPointFactor;
  const controlPoint1 = { x: startPoint.x + horizontalOffset, y: startPoint.y };
  const controlPoint2 = { x: endPoint.x - horizontalOffset, y: endPoint.y };

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
};
