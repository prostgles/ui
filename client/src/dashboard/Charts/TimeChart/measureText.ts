import type { ChartedText, TextMeasurement } from "./../CanvasChart";

const measureTextCache: Map<string, TextMeasurement> = new Map();
export const measureText = (
  s: ChartedText,
  ctx: CanvasRenderingContext2D,
  /**
   * TODO: disable caching because it produces bad results
   */
  useCache = true,
): TextMeasurement => {
  const { textAlign = "", text = "", font = "" } = s;
  const key = [textAlign, text.length, font].join(";");
  const cached = measureTextCache.get(key);
  if (cached && useCache) {
    return cached;
  }
  ctx.fillStyle = s.fillStyle;
  ctx.textAlign = s.textAlign ?? ctx.textAlign;
  ctx.font = s.font || ctx.font;
  const metrics = ctx.measureText(s.text);

  const fontHeight =
    metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
  const actualHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const result = {
    width: metrics.width,
    fontHeight,
    actualHeight,
  };
  measureTextCache.set(key, result);
  return result;
};
