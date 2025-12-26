import { isDefined, pickKeys } from "prostgles-types";
import { nFormatter } from "../../../utils/utils";
import type { Point } from "../../Charts";
import type {
  ChartedText,
  Circle,
  GetShapes,
  MultiLine,
  Rectangle,
} from "../../Charts/CanvasChart";
import type { DeepPartial } from "../../RTComp";
import type { TimeChart, TimeChartD, TimeChartProps } from "./TimeChart";
import { getTimeAxisTicks } from "./getTimeAxisTicks";
import { getTimechartTooltipShapes } from "./getTimechartTooltipShapes";
import { getBinValueLabels } from "./getBinValueLabels";

export function onRenderTimechart(
  this: TimeChart,
  delta: Partial<TimeChartProps & TimeChartD>,
  dd: DeepPartial<TimeChartD> | undefined,
) {
  if (!this.chart) return;

  let reRender = false;
  const { h } = this.chart.getWH();
  const { yMax, xMax, xMin } = this.getMargins();
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
    const { renderStyle = "line", binValueLabelMaxDecimals } = this.props;
    layers.map((layer, layerIndex) => {
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
          variant: renderStyle === "smooth" ? "smooth" : layer.variant,
          strokeStyle: layer.color,
          lineWidth: 2,
          withGradient: this.props.showGradient,
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

        lineTooShort = lineLength < 4;
        const showCircles =
          renderStyle === "scatter plot" ||
          (renderStyle === "line" && lineTooShort);

        const chartWidth = xMax - xMin;
        const numberOfBars = circles.length & layers.length;
        const spacingBetweenBars = 1;
        let barWidth =
          chartWidth / numberOfBars - numberOfBars * spacingBetweenBars;
        const xScale = this.data?.xScale.copy().clamp(false);
        // TODO: Fix bars too wide at high zoom
        const [leftDomain, rightDomain] = xScale?.domain() ?? [];
        if (
          this.props.binSize &&
          xScale &&
          isDefined(leftDomain) &&
          isDefined(rightDomain)
        ) {
          const actualBinSize = this.props.binSize;
          barWidth =
            (xScale(leftDomain + actualBinSize) - xScale(leftDomain)) /
            layers.length;
        }
        const barWidthRounded = 0.9 * barWidth;

        const showBinLabels =
          this.props.showBinLabels && this.props.showBinLabels !== "off" ?
            this.props.showBinLabels
          : undefined;

        const getBars = () => {
          const halfGroupWidth = (barWidthRounded * layers.length) / 2;
          const bars = circles.flatMap((c) => {
            /** Must ensure the tooltip appears on bar center */
            const x =
              c.coords[0] - halfGroupWidth + barWidthRounded * layerIndex;
            const r: Rectangle = {
              ...c,
              coords: [x, c.coords[1]],
              type: "rectangle",
              w: barWidthRounded,
              h: yMax - c.coords[1],
            };

            return r;
          });
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
        minVal,
        maxVal,
        layers,
        getYScale,
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

      const [xForPercYTicks] = this.chart.getDataXY(xMax, 0);
      yTickValues.forEach((v, i) => {
        if (this.props.yAxisScaleMode === "multiple") {
          return;
        }
        const yScale = getYScale(0);
        const yTick: ChartedText = {
          id: `y${i}`,
          text: `${cannotShorten ? v.toLocaleString() : nFormatter(v, 1)}`,
          type: "text",
          coords: [xForYTicks, Math.round(yScale(v))],
          textBaseline: "middle",
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
        // if (
        //   !lastPercTick ||
        //   lastPercTick.coords[1] - yTick.coords[1] > yTicksHeight * 1.2
        // ) {
        //   const yPerc = ((v - minVal) / (maxVal - minVal)) * 100;
        //   yPercTicks.push({
        //     ...yTick,
        //     text: `${yPerc.toFixed(0)}%`,
        //     textAlign: "right",
        //     coords: [xForPercYTicks, Math.round(yScale(v))],
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
