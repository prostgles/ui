import { isDefined, pickKeys } from "prostgles-types";
import { nFormatter } from "../../utils";
import type { Point } from "../Charts";
import type {
  ChartedText,
  Circle,
  GetShapes,
  MultiLine,
  Rectangle,
  Shape,
} from "../Charts/CanvasChart";
import type { DeepPartial } from "../RTComp";
import type { TimeChart, TimeChartD, TimeChartProps } from "./TimeChart";
import { getTimeAxisTicks } from "./getTimeAxisTicks";
import { getTimechartTooltipShapes } from "./getTimechartTooltipShapes";

export function onRenderTimechart(
  this: TimeChart,
  delta: Partial<TimeChartProps & TimeChartD>,
  dd: DeepPartial<TimeChartD> | undefined,
) {
  if (!this.chart) return;

  let reRender = false;
  const { h } = this.chart.getWH();
  const { yMax, xMax } = this.getMargins();
  let lineTooShort = false;

  if (delta.layers) {
    reRender = true;

    this.mainShapes = [];
    this.lineLayers = [];

    this.parseData();

    if (!this.data) {
      return;
    }
    const { layers } = this.data;
    layers.map((layer) => {
      const { sortedParsedData: _data } = layer;
      const firstDataItem = _data?.[0];
      if (firstDataItem) {
        const circlesXY = _data
          .map((c, idx) => {
            const [screenX, screenY]: Point = this.chart!.getScreenXY(c.x, c.y);
            return {
              ...c,
              idx,
              screenX,
              screenY,
            };
          })
          .sort((a, b) => a.screenX - b.screenX);

        /** Why are we doing this? There shouldn't be any performance loss anyway */
        // const xVals = circlesXY.map((c, i) => ({ ...c, i }));
        // const leftVals = xVals.filter(v => v.screenX <= xMin);
        // const rightVals = xVals.filter(v => v.screenX >= xMax);
        // const leftCuttofIndex = (leftVals.at(-2) || leftVals.at(-1))?.i ?? 0;
        // const rightCuttofIndex = (rightVals.at(2) || rightVals.at(1) || rightVals.at(0))?.i ?? (_data.length - 1);
        // const displayedCircles = leftCuttofIndex === rightCuttofIndex && !leftCuttofIndex?
        //   [firstDataItem] :
        //   circlesXY.slice(leftCuttofIndex, rightCuttofIndex);

        const displayedCircles = circlesXY.slice(0);

        const circles: Circle[] = displayedCircles.map((d, i) => ({
          id: i,
          type: "circle",
          coords: [d.x, d.y],
          fillStyle: layer.color,
          strokeStyle: layer.color,
          lineWidth: 0,
          r: 3,
          data: d,
        }));

        const line: MultiLine = {
          id: 1,
          type: "multiline",
          variant: layer.variant,
          strokeStyle: layer.color,
          lineWidth: 2,
          coords: circles.map((c) => c.coords),
          data: circles.map((c) => c.data),
        };

        const lines = [line];

        this.lineLayers?.push({
          ...layer,
          ...pickKeys(line, ["coords", "data"]),
        });

        let lineLength = 0;
        line.coords.map((c, i) => {
          if (i) {
            lineLength += Math.hypot(
              c[0] - line.coords[i - 1]![0],
              c[1] - line.coords[i - 1]![1],
            );
          }
        });

        const { renderStyle = "line", binValueLabelMaxDecimals } = this.props;
        lineTooShort = lineLength < 4;
        const showCircles =
          renderStyle === "scatter plot" ||
          (renderStyle === "line" && lineTooShort);

        let barWidth = xMax / circles.length - circles.length;
        const xScale = this.data?.xScale.copy().clamp(false);
        // TODO: Fix bars too wide at high zoom
        const [leftDomain, rightDomain] = xScale?.domain() ?? [];
        if (
          this.props.binSize &&
          xScale &&
          isDefined(leftDomain) &&
          isDefined(rightDomain)
        ) {
          let actualBinSize = this.props.binSize;
          circles.forEach((c, i) => {
            const prevC = circles[i - 1];
            if (prevC) {
              actualBinSize = Math.min(
                actualBinSize,
                c.data?.date - prevC.data?.date,
              );
            }
          });
          // const bins = Math.round((rightDomain - leftDomain) / actualBinSize);
          barWidth = xScale(leftDomain! + actualBinSize) - xScale(leftDomain!);
        }
        const barWidthRounded = 0.9 * barWidth; //Math.max(2, barWidth);
        const halfBarWidth = Math.round(barWidthRounded / 2);

        const showBinLabels =
          this.props.showBinLabels && this.props.showBinLabels !== "off" ?
            this.props.showBinLabels
          : undefined;

        const getBars = () => {
          const bars = circles.flatMap((c) => {
            const r: Rectangle = {
              ...c,
              coords: [c.coords[0] - halfBarWidth, c.coords[1]],
              type: "rectangle",
              w: barWidthRounded,
              h: yMax - c.coords[1],
            };

            return r;
          });
          //.filter(r => r.coords[0] >= 0 && r.coords[0] <= xMax);
          return bars;
        };

        const labels = getBinValueLabels({
          circles,
          showCircles,
          binValueLabelMaxDecimals,
          renderStyle,
          showBinLabels,
        });
        const finalShapes =
          renderStyle === "bars" ? getBars()
          : showCircles ? circles
          : lines;

        this.mainShapes = this.mainShapes.concat([...finalShapes, ...labels]);
      }
    });
  }

  if (dd || "layers" in delta) {
    reRender = true;
    this.tooltips = getTimechartTooltipShapes.bind(this)();
  }

  if (reRender) {
    if (!this.data) return;

    const getShapes: GetShapes = () => {
      if (!this.data || !this.chart) {
        throw "No data";
      }
      const { xMin, xMax, xForYLabels } = this.getMargins();
      let [leftX] = this.chart.getDataXY(xMin, 0);
      let [rightX] = this.chart.getDataXY(xMax, 0);
      const [xForYTicks] = this.chart.getDataXY(xForYLabels, 0);

      const {
        minDate,
        maxDate,
        dates,
        xScale,
        yScale,
        minVal,
        maxVal,
        layers,
      } = this.data;

      if (!dates.length) return [];

      /** Ensure edge ticks are not outside data extent */
      if (xScale(minDate) > leftX) {
        leftX = xScale(minDate);
      }
      if (xScale(maxDate) < rightX) {
        rightX = xScale(maxDate);
      }

      const timeAxisTicks =
        this.props.showXAxis === false ?
          []
        : getTimeAxisTicks({
            minDate: new Date(xScale.invert(leftX)),
            maxDate: new Date(xScale.invert(rightX)),
            leftX,
            rightX,
            getX: xScale.copy().clamp(false),
            height: h,
            values: layers
              .flatMap((l) => l.sortedParsedData?.map((d) => new Date(d.date)))
              .filter(isDefined),
            measureText: this.chart.measureText,
            getScreenXY: this.chart.getScreenXY,
          });

      const compactYAxis =
        this.props.yAxisVariant === "compact" ||
        (this.canv?.height && this.canv.height < 200);
      const yTickValues =
        compactYAxis ?
          [minVal, maxVal]
        : getYTickValues({ min: minVal, max: maxVal, steps: 6 });
      const cannotShorten =
        compactYAxis ? false : (
          new Set(yTickValues.map((v) => nFormatter(v, 1))).size <
          yTickValues.length
        );
      const yTicks: ChartedText[] = [];
      const yPercTicks: ChartedText[] = [];
      yTickValues.forEach((v, i) => {
        const yTick: ChartedText = {
          id: `y${i}`,
          text: `${cannotShorten ? v.toLocaleString() : nFormatter(v, 1)}`,
          type: "text",
          coords: [xForYTicks, Math.round(yScale(v))],
          /** Alternate top and bottom ticks for better comprehension */
          fillStyle:
            compactYAxis && !i ?
              getCssVariableValue("--color-ticks-1")
            : getCssVariableValue("--color-ticks-0"),
          // background: {
          //   fillStyle: "var(--color-ticks-1)",
          // },
          font: "14px Arial ",
        };
        const yTicksHeight = 14;
        const lastTick = yTicks.at(-1);
        if (
          !lastTick ||
          lastTick.coords[1] - yTick.coords[1] > yTicksHeight * 1.2
        ) {
          yTicks.push(yTick);
        }
        /** TODO: add percentage bar */
        // const lastPercTick = yPercTicks.at(-1);
        // if(!lastPercTick || lastPercTick.coords[1] - yTick.coords[1] > yTicksHeight * 1.2) {
        //   const yPerc = (v - minVal) / (maxVal - minVal) * 100;
        //   yPercTicks.push({
        //     ...yTick,
        //     text: `${yPerc.toFixed(0)}%`,
        //     coords: [xMax - xForYTicks, Math.round(yScale(v))],
        //   });
        // }
      });

      return [...yTicks, ...timeAxisTicks, ...yPercTicks];
    };
    this.chart.render([
      ...this.mainShapes,
      getShapes,
      ...(this.tooltips?.shapes ?? []),
    ]);
  }
}

const getAngle = ([cx, cy]: Point, [ex, ey]: Point) => {
  const dy = ey - cy;
  const dx = ex - cx;
  let theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  //if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
};
type GetBinValueLabelArgs = Pick<
  TimeChartProps,
  "renderStyle" | "binValueLabelMaxDecimals" | "showBinLabels"
> & {
  circles: Circle[];
  showCircles: boolean;
};
const getBinValueLabels = ({
  circles,
  renderStyle,
  binValueLabelMaxDecimals,
  showCircles,
  showBinLabels,
}: GetBinValueLabelArgs) => {
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
      binValueLabelMaxDecimals ?
        c.data.value.toFixed(binValueLabelMaxDecimals)
      : c.data.value;
    const label: ChartedText = {
      ...c,
      type: "text",
      text,
      coords: [x + xOffset, y + yOffset],
      textAlign: showBinLabels === "latest point" ? "start" : "center",
    };
    return label;
  };

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

function getYTickValues(args: {
  min: number;
  max: number;
  steps: number;
}): number[] {
  const { min, max, steps } = args;
  let res: number[] = [];

  /** 1. Get nicest val in range */
  const nicestVal = getNicestVal(min, max);

  /** 2. Get nicest step size */
  const stepSize = (max - min) / steps;
  const stepDelta = (1 / steps) * stepSize;
  const nicestStep = getNicestVal(stepSize - stepDelta, stepSize + stepDelta);

  res = [nicestVal];
  while (res[0]! - nicestStep > min) {
    res = [res[0]! - nicestStep, ...res];
  }
  while (res[res.length - 1]! + nicestStep < max) {
    res = [...res, res[res.length - 1]! + nicestStep];
  }

  return res;
}

function getNicestVal(min: number, max: number): number {
  /** 1. Get nicest val in range */

  const nicestValStr = max + "";
  let nicestVal = max;

  const roundVal = (val: string): number | undefined => {
    const nv0 = Number(val.split("").concat("0").join(""));
    const nv5 = Number(val.split("").concat("5").join(""));
    const preLastDigit = Number(val.split("").slice(0, -1).pop());
    const nv0Next = Number(
      val
        .split("")
        .slice(0, -1)
        .concat([`${preLastDigit - 1}`])
        .join("") + "0",
    );

    return [nv0, nv5, nv0Next].find(
      (v) => Number.isFinite(v) && v >= min && v <= max,
    );
  };

  for (let i = nicestValStr.length; i >= 0; i--) {
    const curVal = nicestValStr.slice(0, i);
    const val = roundVal(curVal);
    if (val !== undefined) {
      nicestVal = val;
    }
  }

  return nicestVal;
}

export const getCssVariableValue = (
  varName: string,
  node: HTMLElement = document.body,
) => {
  return getComputedStyle(node).getPropertyValue(varName);
};
