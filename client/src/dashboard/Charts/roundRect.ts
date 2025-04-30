/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
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
  } = {
    color: "rgba(73, 56, 56, 0.5)",
    blur: 15,
    offsetX: 3,
    offsetY: 3,
  },
) {
  if (typeof radius === "undefined") {
    radius = 5;
  }
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

  const initialLineWidth = ctx.lineWidth;
  const curvedLineWidth = ctx.lineWidth + 1;
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.lineWidth = curvedLineWidth;
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineWidth = initialLineWidth;
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.lineWidth = curvedLineWidth;
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius.br,
    y + height,
  );
  ctx.lineWidth = initialLineWidth;
  ctx.lineTo(x + radius.bl, y + height);
  ctx.lineWidth = curvedLineWidth;
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineWidth = initialLineWidth;
  ctx.lineTo(x, y + radius.tl);
  ctx.lineWidth = curvedLineWidth;
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.lineWidth = initialLineWidth;
  ctx.closePath();

  // Restore the context state
  ctx.restore();
}
