import type { Point } from "../Charts";

export function drawMonotoneXCurve(
  ctx: CanvasRenderingContext2D,
  line: Point[],
) {
  for (let i = 0; i < line.length - 2; i++) {
    if (!i) {
      ctx.moveTo(line[i]![0], line[i]![1]);
    } else {
      const xc = (line[i]![0] + line[i + 1]![0]) / 2;
      const yc = (line[i]![1] + line[i + 1]![1]) / 2;
      ctx.quadraticCurveTo(line[i]![0], line[i]![1], xc, yc);
    }
  }

  // For the last two points, use a straight line
  ctx.lineTo(line[line.length - 2]![0], line[line.length - 2]![1]);
  ctx.lineTo(line[line.length - 1]![0], line[line.length - 1]![1]);
}

/**
 * Get the Y coordinate on a monotone X curve at a given X position
 * This matches the curve drawn by drawMonotoneXCurve
 */
export const getYOnMonotoneXCurve = (
  line: Point[],
  targetX: number,
): number | undefined => {
  // Find the segment containing targetX
  for (let i = 0; i < line.length - 1; i++) {
    const current = line[i]!;
    const next = line[i + 1]!;

    const [x0, y0] = current;
    const [x1, y1] = next;

    // Check if targetX is within this segment
    if ((targetX >= x0 && targetX <= x1) || (targetX >= x1 && targetX <= x0)) {
      // For the last segment (length - 2 to length - 1), use linear interpolation
      if (i >= line.length - 2) {
        const t = (targetX - x0) / (x1 - x0);
        return y0 + t * (y1 - y0);
      }

      // For other segments, use quadratic Bézier curve
      // The control point is the current point (x0, y0)
      // The curve goes from the midpoint of previous segment to midpoint of current segment

      let startX: number, startY: number;
      if (i === 0) {
        // First segment starts at the first point
        startX = x0;
        startY = y0;
      } else {
        // Start at midpoint between previous and current point
        const prev = line[i - 1]!;
        startX = (prev[0] + x0) / 2;
        startY = (prev[1] + y0) / 2;
      }

      // End at midpoint between current and next point
      const endX = (x0 + x1) / 2;
      const endY = (y0 + y1) / 2;

      // Control point is the current point
      const controlX = x0;
      const controlY = y0;

      // Find t parameter for quadratic Bézier curve at targetX
      // Quadratic Bézier: P(t) = (1-t)²*P0 + 2(1-t)t*P1 + t²*P2
      // For X: x(t) = (1-t)²*startX + 2(1-t)t*controlX + t²*endX

      // Solve for t using Newton-Raphson method
      let t = (targetX - startX) / (endX - startX); // Initial guess (linear)

      for (let iter = 0; iter < 10; iter++) {
        const oneMinusT = 1 - t;
        const x =
          oneMinusT * oneMinusT * startX +
          2 * oneMinusT * t * controlX +
          t * t * endX;
        const dx =
          2 * oneMinusT * (controlX - startX) + 2 * t * (endX - controlX);

        if (Math.abs(dx) < 1e-10) break;

        const error = x - targetX;
        if (Math.abs(error) < 0.01) break;

        t = t - error / dx;
      }

      // Clamp t to [0, 1]
      t = Math.max(0, Math.min(1, t));

      // Calculate Y using the same t
      const oneMinusT = 1 - t;
      const y =
        oneMinusT * oneMinusT * startY +
        2 * oneMinusT * t * controlY +
        t * t * endY;

      return y;
    }
  }

  return undefined;
};
