import { isDefined } from "../../utils";
import type { Point } from "../Charts";
import { DAY, HOUR, MINUTE, MONTH, SECOND, toDateStr } from "../Charts";
import type { ChartedText, Circle, MultiLine } from "../Charts/CanvasChart";
import type { TimeChart } from "./TimeChart";

const HoursMinutes: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};
const HoursMinutesSeconds: Intl.DateTimeFormatOptions = {
  ...HoursMinutes,
  second: "2-digit",
};

export const getTimechartTooltipShapes = function (this: TimeChart) {
  const { tooltipPosition = "auto", binSize } = this.props;
  if (!this.chart || tooltipPosition === "hidden") return undefined;

  const getCssVarValue = (name: string) => {
    return getComputedStyle(window.document.documentElement).getPropertyValue(
      name,
    );
  };
  const { yMin, yMax } = this.getMargins();
  const { h } = this.chart.getWH();
  const { xCursor, yCursor } = this.d;
  if (!xCursor || this.panning || (yCursor ?? 0) > yMax - 14) return undefined;
  else {
    let [x] = this.chart.getDataXY(xCursor, yCursor ?? 0);
    const { layers: iLayers = [], snapped_x } =
      this.getIntersections(xCursor) ?? {};
    if (!iLayers.length || !this.data) {
      //  && !("layers" in delta)
      return undefined;
    }

    if (snapped_x) {
      x = snapped_x;
    }

    const tooltipDate = new Date(this.data.xScale.invert(x));
    let tooltipBottomDateText;
    // const { leftX, rightX } = this.chart.getExtent();
    const getMinOffset = () => {
      const minOffset = this.data?.dates.reduce(
        (a, v, i, arr) => {
          if (i) {
            const diff = Math.abs(+v.date - +arr[i - 1]!.date);
            a ??= diff;
            a = Math.min(a, diff);
          }
          return a;
        },
        undefined as number | undefined,
      );
      return minOffset;
    };
    const dateDelta = binSize ?? getMinOffset() ?? HOUR; //(this.data.xScale.invert(rightX) - this.data.xScale.invert(leftX));

    if (
      dateDelta <= SECOND ||
      (tooltipDate.getMilliseconds() !== 0 && snapped_x !== undefined)
    ) {
      tooltipBottomDateText =
        toDateStr(tooltipDate, HoursMinutesSeconds) +
        "." +
        tooltipDate.getMilliseconds();
    } else if (dateDelta <= MINUTE) {
      tooltipBottomDateText = toDateStr(tooltipDate, HoursMinutesSeconds);
      // } else if(dateDelta <= HOUR){
      //   tooltipBottomDateText = toDateStr(tooltipDate, HoursMinutes);
    } else if (dateDelta <= DAY) {
      tooltipBottomDateText = toDateStr(tooltipDate, HoursMinutes);
    } else if (dateDelta <= MONTH) {
      tooltipBottomDateText = toDateStr(tooltipDate, {
        ...HoursMinutes,
        day: "numeric",
        month: "short",
        year: "2-digit",
      });
    } else {
      tooltipBottomDateText = toDateStr(tooltipDate, {
        day: "numeric",
        month: "short",
        year: "2-digit",
      });
    }

    const tooltipBottomDateLabel: ChartedText = {
      id: "tooltipBottomDateLabel",
      type: "text",
      fillStyle: getCssVarValue("--text-0"),
      textAlign: "center",
      text: tooltipBottomDateText,
      background: {
        fillStyle: getCssVarValue("--bg-color-1"),
        strokeStyle: getCssVarValue("--b-color"),
        lineWidth: 1,
        padding: 6,
        borderRadius: 3,
      },
      coords: [x, h - 10],
    };

    const btmW = this.chart.measureText(tooltipBottomDateLabel);
    const { xMin, xMax } = this.getMargins();
    if (xCursor - btmW.width / 2 < xMin + 5) {
      tooltipBottomDateLabel.textAlign = "start";
    } else if (xCursor + btmW.width / 2 > xMax - 5) {
      tooltipBottomDateLabel.textAlign = "end";
    }

    let moveToLeft = false;
    let minLabelY: number | undefined;
    let maxLabelY: number | undefined;
    const labelTickCanvasX = xCursor + 14;
    let textLabels = iLayers
      .map((l) => {
        if (!this.data || l.snapped_data?.value === undefined) {
          return undefined;
        }
        const text =
          l.getYLabel({
            // value: +(l.snapped_data?.value ?? this.data.yScale.invert(l.y)), // Showing yScale.invert might not be useful and needs rounding/max length in some cases
            value: l.snapped_data.value,
            min: this.data.yScale.invert(yMin),
            max: this.data.yScale.invert(yMax),

            prev: this.data.yScale.invert(l.y),
            next: this.data.yScale.invert(l.y),
          }) + (this.props.layers.length > 1 && l.label ? ` ${l.label}` : "");

        const coords: Point = [
          this.chart!.getDataXY(labelTickCanvasX, 0)[0]!,
          l.y + 5,
        ];

        minLabelY ??= coords[1];
        maxLabelY ??= coords[1];
        minLabelY = Math.min(minLabelY, coords[1]);
        maxLabelY = Math.max(maxLabelY, coords[1]);

        const res: ChartedText = {
          id: "tooltip-text-" + Date.now(),
          type: "text",
          fillStyle: getCssVarValue("--text-0"),
          text,
          textAlign: "left",
          background: {
            fillStyle: getCssVarValue("--bg-color-1"),
            strokeStyle: l.color,
            lineWidth: 2,
            padding: 6,
            borderRadius: 3,
          },
          coords,
        };

        if (!moveToLeft) {
          const labelWidth = this.chart!.measureText(res);
          moveToLeft = labelTickCanvasX + labelWidth.width > xMax - 5;
        }

        return res;
      })
      .filter(isDefined);

    // const closerToTop = isDefined(minLabelY) && isDefined(maxLabelY) && minLabelY < h - maxLabelY;

    /** Highest value on top */
    textLabels = textLabels.sort((a, b) => a.coords[1] - b.coords[1]);

    const labelHeight = 28;
    const freeHeight = yMax - Math.min(yMax, textLabels.length * labelHeight);

    /* Adjust text y */
    textLabels = textLabels.map((l, i) => {
      const x = l.coords[0];
      const offset =
        tooltipPosition === "top" ? 0
        : tooltipPosition === "bottom" ? freeHeight
        : tooltipPosition === "middle" ? freeHeight * 0.5
        : undefined;
      let y =
        offset !== undefined ?
          offset + labelHeight * 0.75 + i * labelHeight
        : l.coords[1];
      if (i && offset === undefined) {
        const prevY = textLabels[i - 1]!.coords[1];
        y = Math.max(y, prevY + labelHeight);
        // if(closerToTop){
        // } else {
        //   y = Math.min(y, prevY - labelHeight);
        // }
      }

      return {
        ...l,
        coords: [x, y],
        ...(!moveToLeft ?
          {}
        : {
            coords: [this.chart!.getDataXY(labelTickCanvasX - 28, 0)[0], y],
            textAlign: "end",
          }),
      };
    });

    if (tooltipPosition === "auto") {
      const lowestOnTop = textLabels.slice(0).reverse();
      textLabels = [];
      lowestOnTop.forEach((l, i, arr) => {
        const y = l.coords[1];
        if (!i) {
          l.coords[1] = Math.min(y, yMax);
        } else {
          const prevY = textLabels.at(-1)!.coords[1];
          l.coords[1] = Math.min(prevY - labelHeight, y);
        }
        textLabels.push(l);
      });
    }

    const pointCircles: Circle[] = iLayers.flatMap((l) => {
      const commonOpts: Pick<Circle, "id" | "type" | "coords" | "lineWidth"> = {
        id: `tooltip-${Date.now()}`,
        type: "circle",
        coords: [x, l.y],
        lineWidth: 0,
      };

      return [
        {
          ...commonOpts,
          fillStyle: "white",
          strokeStyle: "white",
          r: 5,
        },
        {
          ...commonOpts,
          coords: [x, l.y],
          fillStyle: l.color,
          strokeStyle: l.color,
          r: 3,
        },
      ];
    });

    const tooltipVertLine: MultiLine = {
      id: "tooltipVertLine",
      type: "multiline",
      lineWidth: 1,
      strokeStyle: "#cecece",
      coords: [
        [x, 0],
        [x, h - 30],
      ],
    };

    const shapes = [
      tooltipVertLine,
      ...pointCircles,
      ...textLabels,
      tooltipBottomDateLabel,
    ];

    return {
      shapes,
      snapped_x,
    };
  }
};
