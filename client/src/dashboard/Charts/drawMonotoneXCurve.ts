import type { Point } from "../Charts";

export function drawMonotoneXCurve(
  ctx: CanvasRenderingContext2D,
  line: Point[],
  skipFirstMove?: boolean,
) {
  if (line.length < 2) return;

  // Move to first point
  if (!skipFirstMove) {
    ctx.moveTo(line[0]![0], line[0]![1]);
  }

  if (line.length === 2) {
    ctx.lineTo(line[1]![0], line[1]![1]);
    return;
  }

  // Draw curves through all intermediate points
  for (let i = 0; i < line.length - 1; i++) {
    const point = line[i]!;
    const nextPoint = line[i + 1]!;

    const xc = (point[0] + nextPoint[0]) / 2;
    const yc = (point[1] + nextPoint[1]) / 2;

    ctx.quadraticCurveTo(point[0], point[1], xc, yc);
  }

  // Complete the curve to the last point
  const lastPoint = line[line.length - 1]!;
  ctx.lineTo(lastPoint[0], lastPoint[1]);
}

/**
 * Get the Y coordinate on a monotone X curve at a given X position
 * This matches the curve drawn by drawMonotoneXCurve
 */
export const getYOnMonotoneXCurve = (
  line: Point[],
  targetX: number,
): number | undefined => {
  if (line.length === 0) return undefined;
  if (line.length === 1) {
    return line[0]![0] === targetX ? line[0]![1] : undefined;
  }

  // Handle the first segment (quadratic curve from first point to first midpoint)
  const firstPoint = line[0]!;
  const secondPoint = line[1]!;
  const firstMidX = (firstPoint[0] + secondPoint[0]) / 2;
  const firstMidY = (firstPoint[1] + secondPoint[1]) / 2;

  const minX = Math.min(firstPoint[0], firstMidX);
  const maxX = Math.max(firstPoint[0], firstMidX);

  if (targetX >= minX && targetX <= maxX) {
    // This is a quadratic Bézier from firstPoint to firstMid with control at firstPoint
    // Start: firstPoint, Control: firstPoint, End: firstMid
    // Since start and control are the same, this degenerates to a line, BUT
    // let's match the actual curve drawn

    // Actually from drawMonotoneXCurve: ctx.quadraticCurveTo(point[0], point[1], xc, yc);
    // where point is firstPoint and (xc, yc) is the midpoint
    // This means: from current position (firstPoint) to (xc, yc) with control at (point[0], point[1])
    // So: Start = firstPoint, Control = firstPoint, End = firstMid

    // Find t using Newton-Raphson
    let t = 0.5;
    for (let iter = 0; iter < 20; iter++) {
      const oneMinusT = 1 - t;
      const x =
        oneMinusT * oneMinusT * firstPoint[0] +
        2 * oneMinusT * t * firstPoint[0] +
        t * t * firstMidX;

      const dx =
        -2 * oneMinusT * firstPoint[0] +
        2 * (oneMinusT - t) * firstPoint[0] +
        2 * t * firstMidX;

      if (Math.abs(dx) < 1e-10) break;

      const error = x - targetX;
      if (Math.abs(error) < 0.001) break;

      t = t - error / dx;
      t = Math.max(0, Math.min(1, t));
    }

    const oneMinusT = 1 - t;
    const y =
      oneMinusT * oneMinusT * firstPoint[1] +
      2 * oneMinusT * t * firstPoint[1] +
      t * t * firstMidY;

    return y;
  }

  // Handle the curved segments (from i=1 to line.length-3)
  for (let i = 1; i < line.length - 2; i++) {
    const prevPoint = line[i - 1]!;
    const point = line[i]!;
    const nextPoint = line[i + 1]!;

    const startX = (prevPoint[0] + point[0]) / 2;
    const startY = (prevPoint[1] + point[1]) / 2;

    const endX = (point[0] + nextPoint[0]) / 2;
    const endY = (point[1] + nextPoint[1]) / 2;

    const controlX = point[0];
    const controlY = point[1];

    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);

    if (targetX >= minX && targetX <= maxX) {
      let t = 0.5;

      for (let iter = 0; iter < 20; iter++) {
        const oneMinusT = 1 - t;
        const x =
          oneMinusT * oneMinusT * startX +
          2 * oneMinusT * t * controlX +
          t * t * endX;

        const dx =
          -2 * oneMinusT * startX +
          2 * (oneMinusT - t) * controlX +
          2 * t * endX;

        if (Math.abs(dx) < 1e-10) break;

        const error = x - targetX;
        if (Math.abs(error) < 0.001) break;

        t = t - error / dx;
        t = Math.max(0, Math.min(1, t));
      }

      const oneMinusT = 1 - t;
      const y =
        oneMinusT * oneMinusT * startY +
        2 * oneMinusT * t * controlY +
        t * t * endY;

      return y;
    }
  }

  // Handle the last segment (straight line from last midpoint to last point)
  if (line.length >= 2) {
    const secondLastPoint = line[line.length - 2]!;
    const lastPoint = line[line.length - 1]!;

    const lastMidX = (secondLastPoint[0] + lastPoint[0]) / 2;
    const lastMidY = (secondLastPoint[1] + lastPoint[1]) / 2;

    if (
      (targetX >= lastMidX && targetX <= lastPoint[0]) ||
      (targetX <= lastMidX && targetX >= lastPoint[0])
    ) {
      const t = (targetX - lastMidX) / (lastPoint[0] - lastMidX);
      return lastMidY + t * (lastPoint[1] - lastMidY);
    }
  }

  return undefined;
};
