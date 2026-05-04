import type { LinkLine, Rectangle } from "../CanvasChart";
import type { ShapeV2 } from "./drawShapes";

export const getLinkLines = (
  shapes: (ShapeV2 | LinkLine)[],
  linkLine: LinkLine,
) => {
  const mainLine = getLinkLinePoints(shapes, linkLine);
  if (!mainLine) return;
  if (linkLine.cardinality === "one-to-one") {
    return [mainLine];
  }

  const extraLine1 = getLinkLinePoints(shapes, linkLine, {
    position: "target",
    value: 3,
  });
  const extraLine2 = getLinkLinePoints(shapes, linkLine, {
    position: "target",
    value: -3,
  });
  if (extraLine1 && extraLine2) {
    return [mainLine, extraLine1, extraLine2];
  }
  return [mainLine];
};

/**
 * How much horizontal offset for control points (adjust for more/less curve)
 *  */
const controlPointFactor = 0.4;

const getLinkLinePoints = (
  shapes: (ShapeV2 | LinkLine)[],
  linkLine: LinkLine,
  yOffset: { value: number; position: "source" | "target" } | null = null,
) => {
  const { sourceId, targetId, sourceYOffset, targetYOffset } = linkLine;
  const r1 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === sourceId,
  );
  const r2 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === targetId,
  );
  if (!r1 || !r2) return;
  const [x1, _y1] = r1.coords;
  const [x2, _y2] = r2.coords;
  const y1 = yOffset?.position === "source" ? _y1 + yOffset.value : _y1;
  const y2 = yOffset?.position === "target" ? _y2 + yOffset.value : _y2;

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
  const dy = endPoint.y - startPoint.y;

  // Keep some bend even when dx is 0 (vertical links), and scale a bit with vertical distance.
  const minHorizontalOffset = 24;
  const verticalInfluence = Math.abs(dy) * 0.12;
  const maxHorizontalOffset = 140;

  const horizontalOffset = Math.min(
    maxHorizontalOffset,
    Math.max(
      minHorizontalOffset,
      Math.abs(dx) * controlPointFactor,
      verticalInfluence,
    ),
  );

  const controlPoint1 = { x: startPoint.x + horizontalOffset, y: startPoint.y };
  const controlPoint2 = { x: endPoint.x - horizontalOffset, y: endPoint.y };
  return {
    startPoint,
    endPoint,
    controlPoint1,
    controlPoint2,
  };
};
