/** Used in making canvas less blurry on mobile */
export function createHiPPICanvas(
  cv: HTMLCanvasElement,
  _w: number,
  _h: number,
) {
  const ratio = window.devicePixelRatio;

  const w = Math.max(30, _w);
  const h = Math.max(30, _h);
  const width = w * ratio;
  const height = h * ratio;
  cv.width = width;
  cv.height = height;
  cv.style.width = w + "px";
  cv.style.height = h + "px";
  if (cv.parentElement?.style.overflow !== "hidden") {
    console.error(
      "Canvas parent should have overflow:hidden to prevent resize-render recursion due to scrollbars",
    );
  }
  if (ratio > 1) {
    cv.getContext("2d")?.scale(ratio, ratio);
  }
  return { cv, width, height };
}
