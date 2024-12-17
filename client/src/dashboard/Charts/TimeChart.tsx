type ChartDate = { v: number; x: number; date: Date };

import type { ScaleLinear } from "d3-scale";
import type { ValidatedColumnInfo } from "prostgles-types";

import React from "react";
import { classOverride } from "../../components/Flex";
import type { Point } from "../Charts";
import type { CanvasChart, Shape } from "../Charts/CanvasChart";
import RTComp from "../RTComp";
import type {
  ShowBinLabelsMode,
  TimechartRenderStyle,
  TooltipPosition,
} from "../W_TimeChart/W_TimeChartMenu";
import type { DateExtent } from "./getTimechartBinSize";
import { getTimechartTooltipIntersections } from "./getTimechartTooltipIntersections";
import { onDeltaTimechart } from "./onDeltaTimechart";
import { prepareTimechartData } from "./prepareTimechartData";

export type DataItem = {
  date: number | string;
  value: number;
};
export type TimeChartLayer = {
  label: string | undefined;
  color: string;
  getYLabel: (opts: {
    value: number;
    min: number;
    max: number;
    prev: number;
    next: number;
  }) => string;
  /** Raw data */
  data: DataItem[];
  // yScale: ScaleLinear<number, number, never>;
  sortedParsedData?: {
    date: number;
    value: number;
    x: number;
    y: number;
  }[];
  fullExtent: [Date, Date];
  variant?: "smooth";
  cols: Pick<
    ValidatedColumnInfo,
    "name" | "label" | "tsDataType" | "udt_name"
  >[];
  groupByValue?: any;
};
export type TimeChartProps = {
  layers: Omit<TimeChartLayer, "yScale">[];
  className?: string;
  onExtentChange?: (visibleData: DateExtent, viewPort: DateExtent) => void;
  onExtentChanged?: (
    visibleData: DateExtent,
    viewPort: DateExtent,
    opts: { resetExtent: boolean },
  ) => void;
  chartRef?: (ref: TimeChart) => void;
  style?: React.CSSProperties;
  tooltipPosition?: TooltipPosition;
  renderStyle?: TimechartRenderStyle;
  showBinLabels?: ShowBinLabelsMode;
  binValueLabelMaxDecimals?: number | null;
  binSize: number | undefined;
  showXAxis?: boolean;
  zoomPanDisabled?: boolean;
  padding?: {
    /**
     * Defaults to 60px
     */
    top?: number;

    /**
     * Defaults to 60px
     */
    bottom?: number;
  };
  yAxisVariant?: "compact";
  onClick?: (ev: { dateMillis: number; isMinDate: boolean }) => void;
};

export type XYFunc = {
  (xData: number, yData?: undefined): [number, undefined];
  (xData: number, yData: number): [number, number];
};

export type TimeChartD = {
  xCursor?: number;
  yCursor?: number;
  extent?: {};
};

export class TimeChart extends RTComp<
  TimeChartProps,
  Record<string, never>,
  TimeChartD
> {
  ref?: HTMLDivElement;
  canv?: HTMLCanvasElement;
  chart?: CanvasChart;
  lineLayers?: (TimeChartLayer & {
    coords: Point[];
  })[];
  style?: React.CSSProperties;

  d: TimeChartD = {};

  data?: {
    layers: TimeChartLayer[];
    dates: ChartDate[];
    xScale: ScaleLinear<number, number, never>;
    xScaleYLabels: ScaleLinear<number, number, never>;
    yScale: ScaleLinear<number, number, never>;

    minDate: number;
    maxDate: number;
    minVal: number;
    maxVal: number;
  };

  lastExtentChange = 0;
  getVisibleExtent = () => {
    if (!this.chart || !this.data) return undefined;

    const { xMin, xMax } = this.getMargins();
    const [leftX] = this.chart.getDataXY(xMin, 0);
    const [rightX] = this.chart.getDataXY(xMax, 0);
    const xScale = this.data.xScale.copy().clamp(false);
    const res = {
      minDate: new Date(xScale.invert(leftX)),
      maxDate: new Date(xScale.invert(rightX)),
    };
    return res;
  };

  /**
   * Margins used to leave space for bottom axis
   * @returns the limits of the linechart area
   */
  getMargins = () => {
    const { w, h } = this.chart!.getWH();
    const { padding } = this.props;
    const xForYLabels = 6;
    // const xMin = 50 + (this.props.showBinLabels? 20 : 0);
    // const xMax = w - (this.props.showBinLabels? 20 : 10);
    const xMin = 50 + 20;
    const xMax = w - 20;
    const yMin = padding?.top ?? 60;
    const yMax = h - (padding?.bottom ?? 50);
    return { xMin, xMax, yMin, yMax, xForYLabels };
  };
  parseData = prepareTimechartData.bind(this);

  getIntersections = getTimechartTooltipIntersections.bind(this);

  mainShapes: Shape[] = [];
  tooltips?: { shapes: Shape[]; snapped_x: number | undefined };
  panning = false;

  getPointXY = (point: { date: Date; value: number }) => {
    if (!this.data || !this.chart) return undefined;
    const x = this.data.xScale(+point.date);
    const y = this.data.xScale(point.value);
    return this.chart.getScreenXY(x, y);
  };
  onDelta = onDeltaTimechart.bind(this);

  render() {
    const { className = "", style = {}, onClick } = this.props;

    const onHover = (e?: React.PointerEvent<HTMLDivElement>) => {
      if (!e) {
        this.setData({ xCursor: undefined, yCursor: undefined });
      } else {
        const r = e.currentTarget.getBoundingClientRect();

        this.setData({
          xCursor: e.clientX - r.x,
          yCursor: e.clientY - r.y,
        });
      }
    };
    return (
      <div
        ref={(e) => {
          if (e) this.ref = e;
        }}
        style={{
          ...style,
        }}
        className={classOverride(
          "charts-comp flex-col f-1 h-fit min-h-0 min-w-0 relative  noselect ",
          className,
        )}
        onPointerMove={onHover}
        onPointerUp={(e) => {
          if (
            this.tooltips?.snapped_x !== undefined &&
            this.data &&
            Date.now() - this.lastExtentChange > 500
          ) {
            onClick?.({
              dateMillis: this.data.xScale
                .copy()
                .invert(this.tooltips.snapped_x),
              isMinDate:
                this.data.xScale.range()[0] === this.tooltips.snapped_x,
            });
          }
          onHover(e);
        }}
        onPointerCancel={() => {
          onHover();
        }}
        onPointerLeave={() => onHover()}
      >
        <canvas
          ref={(e) => {
            if (e) this.canv = e;
          }}
          className="f-1 noselect"
        />
      </div>
    );
  }
}
