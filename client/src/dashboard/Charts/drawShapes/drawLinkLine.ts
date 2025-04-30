import type { Point } from "../../Charts";
import type { LinkLine, Rectangle, Shape } from "../CanvasChart";
import { drawShapes } from "./drawShapes";
export type ShapeV2 = Shape | LinkLine;

export const getCtx = (canvas: HTMLCanvasElement) => {
  return canvas.getContext("2d");
};
export const drawLinkLine = (
  shapes: (Shape | LinkLine)[],
  canvas: HTMLCanvasElement,
  linkLine: LinkLine,
  opts?: {
    scale?: number;
    translate?: { x: number; y: number };
    isChild?: boolean;
  },
) => {
  const {
    id,
    strokeStyle,
    lineWidth,
    variant,
    sourceId,
    targetId,
    sourceYOffset,
    targetYOffset,
  } = linkLine;
  const r1 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === sourceId,
  );
  const r2 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === targetId,
  );
  if (!r1 || !r2) return;
  const [x1, y1] = r1.coords;
  const [x2, y2] = r2.coords;
  const w1 = r1.w;
  const w2 = r2.w;
  const h1 = r1.h;
  const h2 = r2.h;
  const scale = opts?.scale || 1;
  const xTranslate = opts?.translate?.x || 0;
  const yTranslate = opts?.translate?.y || 0;

  const getTranslatedCoords = ([x, y]: Point): Point => [
    (x - xTranslate) / scale,
    (y - yTranslate) / scale,
  ];

  const deltaX = x2 - x1 + w1;
  const deltaY = y2 - y1;
  const padding = 20;

  const linePoints: Point[] = [];

  /**
   * The link should take the shortest path between the two rectangles.
   */
  linePoints.push(
    [x1 + r1.w, y1 + sourceYOffset], // Should add a circle here
    [x1 + r1.w + padding, y1 + sourceYOffset], // first corner
    // [x1 + r1.w + padding + deltaX / 2, y1 + deltaY / 2], // up or down up to midpoint
    // [x1 + r1.w + padding + deltaX / 2, y1 + deltaY / 2], // mid transition
    // [x2 + r2.w + padding + deltaX / 2, y1 + deltaY / 2], // up to second corner
    [x2 - padding, y2 + targetYOffset],
    [x2, y2 + targetYOffset],
  );

  drawShapes(
    [
      {
        id,
        type: "multiline",
        coords: linePoints.map(getTranslatedCoords),
        lineWidth,
        strokeStyle,
        // variant: "smooth",
      },
    ],
    canvas,
    opts,
  );
};
