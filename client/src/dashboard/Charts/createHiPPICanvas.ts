/** Used in making canvas less blurry on mobile */
export const createHiPPICanvas = (
  canvas: HTMLCanvasElement,
  _w: number,
  _h: number,
) => {
  const ratio = window.devicePixelRatio;

  const w = Math.max(30, _w);
  const h = Math.max(30, _h);
  const width = w * ratio;
  const height = h * ratio;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const overflowThatWillNotCauseScrollbars = ["hidden", "visible", "clip"];
  const parentStyle = getComputedStyle(canvas.parentElement!);
  if (
    canvas.isConnected &&
    !overflowThatWillNotCauseScrollbars.includes(parentStyle.overflow)
  ) {
    throw new Error(
      `Canvas parent should have overflow:${overflowThatWillNotCauseScrollbars.join(" | ")} to prevent resize-render recursion due to scrollbars`,
    );
  }
  if (ratio > 1) {
    canvas.getContext("2d")?.scale(ratio, ratio);
  }
  return { cv: canvas, width, height };
};
