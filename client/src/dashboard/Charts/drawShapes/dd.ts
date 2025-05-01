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
    // variant, // Not used for 90-degree lines
    sourceId,
    targetId,
    sourceYOffset, // Offset from the top (y-coordinate) of the source
    targetYOffset, // Offset from the top (y-coordinate) of the target
  } = linkLine;

  const r1 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === sourceId,
  );
  const r2 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === targetId,
  );

  if (!r1 || !r2) return;

  const [x1, y1] = r1.coords;
  const w1 = r1.w;
  // const h1 = r1.h;
  const [x2, y2] = r2.coords;
  // const w2 = r2.w;
  // const h2 = r2.h;

  const scale = opts?.scale || 1;
  const xTranslate = opts?.translate?.x || 0;
  const yTranslate = opts?.translate?.y || 0;

  const getTranslatedCoords = ([x, y]: Point): Point => [
    (x - xTranslate) / scale,
    (y - yTranslate) / scale,
  ];

  // --- 6-Point Orthogonal Routing Logic (H-V-H-V-H style) ---

  const padding = 20; // Horizontal distance for the first and last segments

  // Calculate the exact start and end points ON the rectangle edges
  const p0_startOnRect: Point = [x1 + w1, y1 + sourceYOffset];
  const p5_endOnRect: Point = [x2, y2 + targetYOffset];

  // Calculate points extended horizontally from the rectangles
  const p1_startAway: Point = [p0_startOnRect[0] + padding, p0_startOnRect[1]];
  const p4_endNear: Point = [p5_endOnRect[0] - padding, p5_endOnRect[1]];

  // Calculate the vertical midpoint Y-coordinate for the central horizontal segment
  // This creates the "up/down to midpoint" behavior.
  const midY = p1_startAway[1] + (p4_endNear[1] - p1_startAway[1]) / 2;

  // Calculate the intermediate corner points
  // P2: Moves vertically from p1_startAway to midY
  const p2_corner1: Point = [p1_startAway[0], midY];

  // P3: Moves horizontally from p2_corner1 to align vertically with p4_endNear
  const p3_corner2: Point = [p4_endNear[0], midY];

  // Assemble the 6 points for the multi-line path
  const linePoints: Point[] = [
    p0_startOnRect, // 0: Touch source box
    p1_startAway, // 1: A bit out (horizontal)
    p2_corner1, // 2: Up/down to midpoint Y (vertical)
    p3_corner2, // 3: Across horizontally at midpoint Y
    p4_endNear, // 4: Up/down to target Y level (vertical)
    p5_endOnRect, // 5: Touch target box (horizontal)
  ];

  // Filter out consecutive duplicate points (can happen if padding is 0 or rects overlap weirdly)
  const uniqueLinePoints = linePoints.filter((p, i, arr) => {
    if (i === 0) return true;
    // Check both x and y coordinates
    const prev = arr[i - 1];
    // Use a small tolerance for floating point comparisons if necessary
    // const tolerance = 0.01;
    // return Math.abs(p[0] - prev[0]) > tolerance || Math.abs(p[1] - prev[1]) > tolerance;
    return p[0] !== prev![0] || p[1] !== prev![1];
  });

  // --- Drawing ---

  drawShapes(
    [
      {
        id,
        type: "multiline",
        coords: uniqueLinePoints.map(getTranslatedCoords), // Apply transformations
        lineWidth: lineWidth || 1,
        strokeStyle: strokeStyle || "black",
      },
      // Optional markers (uncomment to add)
      /*
       {
         id: `${id}-start-marker`,
         type: "circle",
         coords: getTranslatedCoords(p0_startOnRect),
         radius: 3,
         fillStyle: strokeStyle || "black",
       },
       {
         id: `${id}-end-marker`,
         type: "circle",
         coords: getTranslatedCoords(p5_endOnRect),
         radius: 3,
         fillStyle: strokeStyle || "black",
       }
       */
    ],
    canvas,
    { ...opts, isChild: true },
  );
};
