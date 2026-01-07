import { clamp } from "src/dashboard/SchemaGraph/ERDSchema/useDrawSchemaShapes";
import { isDefined } from "../../../utils/utils";
import type { Point } from "../../Charts";
import { DAY, HOUR, MINUTE, MONTH, SECOND, toDateStr } from "../../Charts";
import type { ChartedText, Circle, MultiLine } from "../../Charts/CanvasChart";
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
    const { layers = [], snapped_x } = this.getIntersections(xCursor) ?? {};
    if (!layers.length || !this.data) {
      //  && !("layers" in delta)
      return undefined;
    }

    if (snapped_x) {
      x = snapped_x;
    }

    const tooltipDate = new Date(this.data.xScale.invert(x));
    let tooltipBottomDateText: string;
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

    const dateText = [
      tooltipDate.getFullYear(),
      tooltipDate.getMonth() + 1,
      tooltipDate.getDate(),
    ].join("-");

    if (
      dateDelta <= SECOND ||
      (tooltipDate.getMilliseconds() !== 0 && snapped_x !== undefined)
    ) {
      tooltipBottomDateText =
        toDateStr(tooltipDate, HoursMinutesSeconds) +
        "." +
        tooltipDate.getMilliseconds() +
        " " +
        dateText;
    } else if (dateDelta <= MINUTE) {
      tooltipBottomDateText =
        toDateStr(tooltipDate, HoursMinutesSeconds) + " " + dateText;
    } else if (dateDelta <= DAY) {
      tooltipBottomDateText =
        toDateStr(tooltipDate, HoursMinutes) + " " + dateText;
    } else if (dateDelta <= MONTH) {
      tooltipBottomDateText =
        toDateStr(tooltipDate, {
          ...HoursMinutes,
        }) +
        " " +
        dateText;
    } else {
      tooltipBottomDateText = dateText;
    }

    const tooltipBottomDateLabel: ChartedText = {
      id: "tooltipBottomDateLabel",
      type: "text",
      // font: "20px " + getComputedStyle(this.canv || document.body).fontFamily,
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
      elevation: 8,
      coords: [x, h - 10],
    };

    const btmW = this.chart.measureText(tooltipBottomDateLabel);
    const { xMin, xMax } = this.getMargins();
    if (xCursor - btmW.width / 2 < xMin + 5) {
      tooltipBottomDateLabel.textAlign = "start";
    } else if (xCursor + btmW.width / 2 > xMax - 5) {
      tooltipBottomDateLabel.textAlign = "end";
    }

    const labelHeight = 28;
    let moveToLeft = false;
    let minLabelY: number | undefined;
    let maxLabelY: number | undefined;
    const labelTickCanvasX = xCursor + labelHeight / 2;
    const labelYMin = yMin;
    const labelYMax = yMax - labelHeight / 2;
    let textLabels = layers
      .map((l, layerIndex) => {
        if (!this.data || l.snapped_data?.value === undefined) {
          return undefined;
        }
        const yScale = this.data.getYScale(layerIndex);
        const text =
          l.getYLabel({
            // value: +(l.snapped_data?.value ?? this.data.yScale.invert(l.y)), // Showing yScale.invert might not be useful and needs rounding/max length in some cases
            value: l.snapped_data.value,
            min: yScale.invert(yMin),
            max: yScale.invert(yMax),

            prev: yScale.invert(l.y),
            next: yScale.invert(l.y),
          }) + (this.props.layers.length > 1 && l.label ? ` ${l.label}` : "");

        const y = clamp(l.y + 5, labelYMin, labelYMax);
        const coords: Point = [
          this.chart!.getDataXY(labelTickCanvasX, 0)[0],
          y,
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
    textLabels = textLabels.toSorted((a, b) => a.coords[1] - b.coords[1]);

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
            coords: [
              this.chart!.getDataXY(labelTickCanvasX - labelHeight, 0)[0],
              y,
            ],
            textAlign: "end",
          }),
      };
    });

    if (tooltipPosition === "auto") {
      const labelsBottomToTop = textLabels.slice(0).toReversed();
      textLabels = [];
      const labelGapsToBottom: { index: number; gap: number }[] = [];
      labelsBottomToTop.forEach((label, index) => {
        const y = label.coords[1];
        const isFirst = index === 0;
        if (isFirst) {
          label.coords[1] = clamp(y, labelYMin, labelYMax);
        } else {
          const prevY = textLabels.at(-1)!.coords[1];
          label.coords[1] = clamp(y, labelYMin, prevY - labelHeight);
        }
        const prevY = textLabels.at(-1)?.coords[1] ?? labelYMax;
        const gap = prevY - label.coords[1] - labelHeight;
        if (gap) {
          labelGapsToBottom.unshift({
            index,
            gap,
          });
        }
        textLabels.push(label);
      });

      const topOverflow =
        !textLabels.length ? 0 : (
          labelYMin - labelHeight / 2 - textLabels.at(-1)!.coords[1]
        );
      if (topOverflow > 0) {
        let remainingOverflow = topOverflow;
        for (
          let i = 0;
          i < labelGapsToBottom.length && remainingOverflow > 0;
          i++
        ) {
          const { index, gap } = labelGapsToBottom[i]!;
          textLabels.slice(index).forEach((label) => {
            label.coords[1] += Math.min(gap, remainingOverflow);
          });
          remainingOverflow -= gap;
        }
      }
    }

    const pointCircles: Circle[] = layers.flatMap((l) => {
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
