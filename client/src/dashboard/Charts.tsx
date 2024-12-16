import React from "react";
import type { CanvasChartViewDataExtent } from "./Charts/CanvasChart";
import { CanvasChart } from "./Charts/CanvasChart";
import RTComp from "./RTComp";
import { classOverride } from "../components/Flex";

export const MILLISECOND = 1;
export const SECOND = MILLISECOND * 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const MONTH = DAY * 30;
export const YEAR = DAY * 365;

const padded = (v: number) => v.toString().padStart(2, "0");
export const dateAsYMD = (date: Date) => {
  return `${date.getFullYear()}-${padded(date.getMonth() + 1)}-${padded(date.getDate())}`;
};
export const dateAsYMD_Time = (date: Date) => {
  return (
    dateAsYMD(date) +
    ` ${padded(date.getHours())}:${padded(date.getMinutes())}:${padded(date.getSeconds())}`
  );
};

export function onPinchZoom(
  el: HTMLElement,
  callback: (
    ratio: number,
    center: { x: number; y: number; e: TouchEvent },
  ) => any,
) {
  let hypo: number | undefined = undefined;

  el.addEventListener(
    "touchmove",
    function (event) {
      // Check if the two target touches are the same ones that started
      if (event.touches.length === 2 && event.targetTouches.length === 2) {
        //get distance between fingers
        const hypo1 = Math.hypot(
          event.touches[0]!.pageX - event.touches[1]!.pageX,
          event.touches[0]!.pageY - event.touches[1]!.pageY,
        );
        if (hypo === undefined) {
          hypo = hypo1;
        } else {
          const rect = el.getBoundingClientRect();
          const x =
            rect.x + (event.touches[0]!.pageX + event.touches[1]!.pageX) / 2;
          const y =
            rect.y + (event.touches[0]!.pageY + event.touches[1]!.pageY) / 2;
          const ratio = hypo1 / hypo; // if > 0 then zoom in
          callback(ratio, { x, y, e: event });
        }
      }
    },
    false,
  );

  el.addEventListener(
    "touchend",
    function (event) {
      hypo = undefined;
    },
    false,
  );
}

const cachedVals: {
  [key: string]: string;
} = {};

export const toDateStr = (
  date = new Date(),
  opts: Intl.DateTimeFormatOptions,
): string => {
  const key = JSON.stringify({ d: Math.round(+date), opts });
  if (cachedVals[key]) return cachedVals[key]!;
  else cachedVals[key] = date.toLocaleString(navigator.language, opts);
  return cachedVals[key]!;
};

export type Point = [number, number];
export type Coords = Point | Point[];

type ChartD = {
  xCursor: number | null;
  yCursor: number | null;
  extent?: CanvasChartViewDataExtent;
};
export class Chart extends RTComp<
  {
    className?: string;
    style?: Omit<React.CSSProperties, "backgroundColor" | "background">;
    setRef: (chart: CanvasChart) => void;
    onExtentChange?: (extent: CanvasChartViewDataExtent) => void;
  },
  {},
  ChartD
> {
  d: ChartD = {
    xCursor: null,
    yCursor: null,
  };

  ref?: HTMLDivElement;
  canv?: HTMLCanvasElement;
  chart?: CanvasChart;
  panning = false;

  onMount() {
    const { setRef, onExtentChange } = this.props;
    if (!this.ref || !this.canv) return;
    this.chart = new CanvasChart({
      node: this.ref,
      canvas: this.canv,
      yScaleLocked: true,
      yPanLocked: true,
      minXScale: 1,
      onResize: undefined,
      events: {
        onExtentChange: (extent) => {
          onExtentChange?.(extent);
          this.setData({ extent });
        },
        onPan: () => {
          this.panning = true;
        },
        onPanEnd: () => {
          this.panning = false;
        },
      },
    });
    setRef(this.chart);
  }

  render() {
    const { className = "", style = {} } = this.props;
    return (
      <div
        ref={(e) => {
          if (e) this.ref = e;
        }}
        style={{
          ...style,
        }}
        className={classOverride(
          "charts-comp flex-col f-1 min-h-0 min-w-0 relative ",
          className,
        )}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();

          this.setData({
            xCursor: e.clientX - r.x,
            yCursor: e.clientY - r.y,
          });
          // console.log(this.chart.getDataXY(screenX, screenY))
        }}
        onMouseOut={() => {
          this.setData({ xCursor: null, yCursor: null });
        }}
      >
        <canvas
          ref={(e) => {
            if (e) this.canv = e;
          }}
          className="f-1"
        />
      </div>
    );
  }
}

export function roundToNearest(val: number, increment: number, maxVal: number) {
  const maxIncremented = maxVal - (maxVal % increment);
  return Math.min(maxIncremented, Math.ceil(val / increment) * increment);
}

// export function linearScale(args: {
//   clamped?: boolean;
//   value: number;
//   input: [number, number];
//   output: [number, number];
// }): number {
//   const {
//     clamped,
//     value ,
//     input,
//     output
//   } = args;

//   const [val1, val2] = input;
//   const [out1, out2] = input;

//   const inputAsc = val1 < val2;
//   const outputAsc = out1 < out2;

//   let v = value;
//   if(clamped){
//     v = inputAsc? clamp(v, val1, val2) : clamp(v, val2, val1);
//   }

//   let result: number;

//   return result;
// }

function clamp(num: number, min: number, max: number) {
  return (
    num <= min ? min
    : num >= max ? max
    : num
  );
}
