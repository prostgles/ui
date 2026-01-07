import { getCssVariableValue } from "./TimeChart/onRenderTimechart";

export const DEFAULT_SHADOW = {
  color: getCssVariableValue("--shadow1"), //"rgba(73, 56, 56, 0.5)",
  blur: 15,
  offsetX: 3,
  offsetY: 3,
};

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; bl: number; br: number },
  shadow: {
    color?: string;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
  } = DEFAULT_SHADOW,
) {
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (const side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  // Save the current context state
  ctx.save();

  // Apply shadow if provided
  if (shadow.blur) {
    ctx.shadowColor = shadow.color || "rgba(0,0,0,0.5)";
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX ?? 12;
    ctx.shadowOffsetY = shadow.offsetY ?? 12;
  }

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius.tl);
  ctx.fill();
  ctx.stroke();
  // const initialLineWidth = ctx.lineWidth;
  // const curvedLineWidth = ctx.lineWidth + 1;
  // ctx.beginPath();
  // ctx.moveTo(x + radius.tl, y);
  // ctx.lineTo(x + width - radius.tr, y);
  // ctx.lineWidth = curvedLineWidth;
  // ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  // ctx.lineWidth = initialLineWidth;
  // ctx.lineTo(x + width, y + height - radius.br);
  // ctx.lineWidth = curvedLineWidth;
  // ctx.quadraticCurveTo(
  //   x + width,
  //   y + height,
  //   x + width - radius.br,
  //   y + height,
  // );
  // ctx.lineWidth = initialLineWidth;
  // ctx.lineTo(x + radius.bl, y + height);
  // ctx.lineWidth = curvedLineWidth;
  // ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  // ctx.lineWidth = initialLineWidth;
  // ctx.lineTo(x, y + radius.tl);
  // ctx.lineWidth = curvedLineWidth;
  // ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  // ctx.lineWidth = initialLineWidth;
  // ctx.closePath();

  // Restore the context state
  ctx.restore();
}
