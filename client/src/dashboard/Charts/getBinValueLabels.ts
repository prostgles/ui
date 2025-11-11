import type { Point } from "../Charts";
import type { ChartedText, Circle } from "./CanvasChart";
import type { TimeChartProps } from "./TimeChart";

type GetBinValueLabelArgs = Pick<
  TimeChartProps,
  "renderStyle" | "binValueLabelMaxDecimals" | "showBinLabels"
> & {
  circles: Circle[];
  showCircles: boolean;
};
export const getBinValueLabels = ({
  circles,
  renderStyle,
  binValueLabelMaxDecimals,
  showCircles,
  showBinLabels,
}: GetBinValueLabelArgs) => {
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: binValueLabelMaxDecimals ?? undefined,
    maximumFractionDigits: binValueLabelMaxDecimals ?? undefined,
  });
  const getLabel = (
    c: Circle,
    prevP: Point | undefined,
    nextP: Point | undefined,
  ) => {
    const [x, y] = c.coords;

    const angles = {
      p: prevP && getAngle(prevP, c.coords) > 55,
      n: nextP && getAngle(c.coords, nextP) < -55,
    };

    const textSize = 16;
    const textMargin = showCircles ? 8 : 5;

    let xOffset = 0;
    if (prevP && nextP) {
      const a1 = getAngle(prevP, c.coords);
      const a2 = getAngle(c.coords, nextP);
      const lineIsVertical =
        [a1, a2].every((v) => v > -120 && v < -70) ||
        [a1, a2].every((v) => v > 70 && v < 120);
      if (lineIsVertical) xOffset = -textSize;
    }

    const showBelow =
      renderStyle === "line" && !showCircles && (angles.p || angles.n);
    const yOffset = showBelow ? textMargin + textSize : -textMargin;
    const text =
      Number.isFinite(c.data.value) ? formatter.format(c.data.value) : "";

    const label: ChartedText = {
      ...c,
      type: "text",
      text,
      coords: [x + xOffset, y + yOffset],
      textAlign: showBinLabels === "latest point" ? "start" : "center",
    };
    return label;
  };

  // TODO: when rendering multiple layers (barchart with groupBy), avoid overlapping labels
  if (showBinLabels === "latest point") {
    const lastPoint = circles.at(-1);
    return (lastPoint && [getLabel(lastPoint, undefined, undefined)]) ?? [];
  }

  if (showBinLabels === "all points") {
    const labels: ChartedText[] = [];
    circles.forEach((c, i) => {
      const prevP = circles[i - 1];
      const nextP = circles[i + 1];
      const label = getLabel(c, prevP?.coords, nextP?.coords);
      const minWidth = 50;
      const prevLabel = labels.at(-1);
      if (prevLabel && prevLabel.coords[0] > label.coords[0] - minWidth) {
      } else {
        labels.push(label);
      }
    });

    return labels;
  }

  return [];
};

const getAngle = ([cx, cy]: Point, [ex, ey]: Point) => {
  const dy = ey - cy;
  const dx = ex - cx;
  let theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  //if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
};
