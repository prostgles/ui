import type { Point } from "../Charts";

export function drawMonotoneXCurve(
  ctx: CanvasRenderingContext2D,
  line: Point[],
) {
  ctx.beginPath();

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
  ctx.stroke();
}
