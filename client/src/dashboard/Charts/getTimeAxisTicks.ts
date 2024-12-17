import {
  dateAsYMD,
  DAY,
  HOUR,
  MINUTE,
  MONTH,
  roundToNearest,
  SECOND,
  toDateStr,
  YEAR,
} from "../Charts";
import { getAge } from "../../../../commonTypes/utils";
import type { XYFunc } from "./TimeChart";
import type { DateExtent } from "./getTimechartBinSize";
import type { ChartedText, TextMeasurement } from "./CanvasChart";
import { isDefined } from "prostgles-types";
import { getCssVariableValue } from "./onRenderTimechart";

type GetTimeTicksOpts = DateExtent & {
  leftX: number;
  rightX: number;
  height: number;
  getX: (dateVal: number) => number;
  getScreenXY: XYFunc;
  measureText: (txt: ChartedText) => TextMeasurement;
  /** If provided then render these values */
  values: undefined | Date[];
};

type DateIncrementer = {
  id: string;
  getStart: (d: Date) => Date;
  getLabel: (d: Date) => string;
  // getNext: (d: Date) => Date;
  dateDelta: number;
};

export function getTimeAxisTicks(args: GetTimeTicksOpts): ChartedText[] {
  const {
    minDate: lDate,
    maxDate: rDate,
    getX,
    leftX,
    rightX,
    height,
    measureText,
    getScreenXY,
    values,
  } = args;

  const age = getAge(+lDate, +rDate, true);
  const color0 = getCssVariableValue("--color-ticks-0");
  const color1 = getCssVariableValue("--color-ticks-1");

  const getTickText = (args: { text: string } & Partial<ChartedText>) => {
    return {
      type: "text",
      font: "12px Arial",
      fillStyle: color0,
      textAlign: "center",
      ...args,
    } as ChartedText;
  };

  const IDEAL_SPACING = 30;
  const MIN_SPACING = 20;

  const getLabelHHMM = (d: Date) =>
    toDateStr(d, { hour: "2-digit", minute: "2-digit" });
  const getStartMINUTES = (d: Date) =>
    new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
    );

  const incrementers: DateIncrementer[] = [
    {
      id: "100 Year",
      getStart: (d: Date) =>
        new Date(roundToNearest(d.getFullYear(), 100, 3000), 0, 1),
      dateDelta: 100 * MONTH * 12,
      getLabel: (d: Date) => toDateStr(d, { year: "numeric" }),
    },
    {
      id: "10 Year",
      getStart: (d: Date) =>
        new Date(roundToNearest(d.getFullYear(), 10, 3000), 0, 1),
      dateDelta: 10 * MONTH * 12,
      getLabel: (d: Date) => toDateStr(d, { year: "numeric" }),
    },
    {
      id: "Yearly",
      getStart: (d: Date) => new Date(d.getFullYear(), 0, 1),
      dateDelta: MONTH * 12,
      getLabel: (d: Date) => toDateStr(d, { year: "numeric" }),
    },
    {
      id: "Quarter Yearly",
      getStart: (d: Date) => new Date(d.getFullYear(), 0, 1),
      dateDelta: MONTH * 3,
      getLabel: (d: Date) => toDateStr(d, { month: "short" }),
    },
    {
      id: "Monthly",
      getStart: (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1),
      dateDelta: MONTH,
      getLabel: (d: Date) => toDateStr(d, { month: "short" }),
    },
    {
      id: "Weekly",
      dateDelta: DAY * 7,
      getStart: (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      getLabel: (d: Date) => toDateStr(d, { day: "numeric" }),
    },
    {
      id: "Daily",
      dateDelta: DAY,
      getStart: (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      getLabel: (d: Date) => toDateStr(d, { day: "numeric" }),
    },
    ...[12, 6, 3, 2, 1].map((multiplier) => ({
      id: multiplier + " Hour",
      dateDelta: HOUR * multiplier,
      getStart: (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()),
      getLabel: getLabelHHMM,
    })),
    ...[30, 20, 15, 10, 5, 2, 1].map((multiplier) => ({
      id: multiplier + " Minute",
      dateDelta: MINUTE * multiplier,
      getStart: getStartMINUTES,
      getLabel: getLabelHHMM,
    })),
    ...[30, 20, 15, 10, 5, 2, 1].map((multiplier) => ({
      id: multiplier + " Second",
      dateDelta: SECOND * multiplier,
      getStart: (d: Date) => {
        d = new Date(+d);
        d.setSeconds(0);
        return new Date(+d);
      },
      getLabel: (d: Date) =>
        toDateStr(d, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    })),
    ...[500, 250, 100, 50, 25, 15, 10, 5, 2, 1].map((multiplier) => ({
      id: multiplier + " Millisecond",
      dateDelta: multiplier,
      getStart: (d: Date) => {
        d = new Date(+d);
        const val = d.getMilliseconds();
        d.setMilliseconds(roundToNearest(val, multiplier, 999));
        return new Date(+d);
      },
      getLabel: (d: Date) =>
        toDateStr(d, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) +
        "." +
        d.toISOString().slice(20, -1),
    })),
  ];

  const MIDTICK_STYLE: Pick<
    ChartedText,
    "type" | "font" | "fillStyle" | "textAlign"
  > = {
    type: "text",
    font: "12px Arial",
    fillStyle: color0,
    textAlign: "center",
  };

  if (Number.isFinite(+lDate) && +lDate === +rDate) {
    const row1 = toDateStr(lDate, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const row2 = dateAsYMD(lDate); // toDateStr(lDate, { year: "numeric", month: "2-digit", day: "2-digit" });
    const t1: ChartedText = {
      ...MIDTICK_STYLE,
      font: "16px Arial",
      id: "t1",
      text: row1,
      coords: [getX(+lDate), height - 28],
    };
    const t2: ChartedText = {
      ...MIDTICK_STYLE,
      font: "600 14px Arial",
      id: "t2",
      text: row2,
      coords: [getX(+lDate), height - 10],
    };

    return [t1, t2];
  }

  let incs = incrementers.map((inc) => {
    /* Get start point v, then two consecutive v1, v2 to ensure we have a full spacing between v1 and v2 */
    const v = inc.getStart(new Date(+lDate)),
      v1 = new Date(+v + inc.dateDelta),
      // v2 = inc.dateDelta? new Date(+v1 + inc.dateDelta) : inc.getNext(new Date(+v1)),
      v2 = new Date(+v1 + inc.dateDelta),
      tickWidth = measureText(
        getTickText({ text: inc.getLabel(new Date(2001, 1, 1)) }),
      ).width,
      x1 = getScreenXY(getX(+v1), 0)[0],
      x2 = getScreenXY(getX(+v2), 0)[0],
      spacing = x2 - x1 - tickWidth;

    // console.log(lDate, rDate)
    return {
      inc,
      spacing,
      diffFromIdeal: Math.abs(spacing - IDEAL_SPACING),
    };
  });

  incs = incs.filter((inc) => inc.spacing > MIN_SPACING);

  if (!incs.length) return [];
  const theChosenInc = incs.sort(
    (a, b) => a.diffFromIdeal - b.diffFromIdeal,
  )[0]!.inc;

  let midTicks: { x: number; v: number; label: string }[] = [];
  const getTickChartedText = (
    tick: (typeof midTicks)[number],
    i: number,
  ): ChartedText & { xRange: [number, number] } => {
    const ct: ChartedText = {
      id: "midTicks" + i,
      ...MIDTICK_STYLE,
      text: tick.label,
      coords: [tick.x, height - 10],
    };

    const x = getScreenXY(ct.coords[0], 0)[0];
    const w = measureText(ct).width;

    return {
      ...ct,
      xRange: [x - w / 2, x + w / 2],
    };
  };

  const getProvidedTicks = (): undefined | typeof midTicks => {
    const newMidTicks = values?.map((date) => {
      const v = +date;
      return {
        v,
        x: getX(v),
        label: theChosenInc.getLabel(date),
      };
    });

    const chartedTicks = newMidTicks?.map(getTickChartedText);

    const noOverlap = chartedTicks?.every((t, i) => {
      const prevT = chartedTicks[i - 1];
      const nextT = chartedTicks[i + 1];

      return ![prevT, nextT].filter(isDefined).some((st: typeof t) => {
        const overlap =
          t.xRange[0] < st.xRange[1] && t.xRange[1] > st.xRange[0];

        return overlap;
      });
    });

    return noOverlap ? newMidTicks : undefined;
  };

  const providedTicks = getProvidedTicks();
  if (providedTicks) {
    midTicks = providedTicks;
  } else {
    let d = theChosenInc.getStart(lDate);
    do {
      const v = +d;
      midTicks.push({
        v,
        x: getX(v),
        label: theChosenInc.getLabel(d),
      });
      d = new Date(+d + theChosenInc.dateDelta);
    } while (+d < +rDate);
  }

  const y_top = height - 20,
    y_bottom = height - 5;

  /**
   * Edge time tick labels
   */
  const lt: ChartedText = getTickText({
      id: "lt",
      textAlign: "start",
      text: toDateStr(lDate, { month: "short" }),
      coords: [leftX, y_top],
    }),
    lb: ChartedText = getTickText({
      id: "lb",
      textAlign: "start",
      text: toDateStr(lDate, { year: "numeric" }),
      font: "600 14px Arial",
      coords: [leftX, y_bottom],
    }),
    rt: ChartedText = getTickText({
      id: "lt",
      textAlign: "end",
      text: toDateStr(rDate, { month: "short" }),
      coords: [rightX, y_top],
    }),
    rb: ChartedText = getTickText({
      id: "lb",
      textAlign: "end",
      text: toDateStr(rDate, { year: "numeric" }),
      font: "600 14px Arial",
      coords: [rightX, y_bottom],
    });

  if (age.seconds < 10) {
    lt.text =
      toDateStr(lDate, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }) +
      "." +
      lDate.getMilliseconds();
    rt.text =
      toDateStr(rDate, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }) +
      "." +
      rDate.getMilliseconds();

    lb.text = `${lDate.getDate()} ${toDateStr(lDate, { month: "short" })} ${lDate.getFullYear()}`;
    rb.text = `${rDate.getDate()} ${toDateStr(rDate, { month: "short" })} ${rDate.getFullYear()}`;
  } else if (age.days < 3) {
    lt.text = `${lDate.getDate()} ${lt.text}`;
    rt.text = `${rDate.getDate()} ${rt.text}`;
  }

  // console.log(midTicks.map(t => t.x), rightX - 50)
  const leftTickMaxWidth =
    Math.max(measureText(lt).width, measureText(lb).width) + 10;
  const rightTickMaxWidth =
    Math.max(measureText(rt).width, measureText(rb).width) + 10;
  const leftTickMaxX = Math.max(getScreenXY(leftX, 0)[0] + leftTickMaxWidth);
  const rightTickMinX = Math.max(getScreenXY(rightX, 0)[0] - rightTickMaxWidth);

  return [
    lt,
    lb,
    ...midTicks
      .map(
        (t, i) =>
          ({
            id: "midTicks" + i,
            ...MIDTICK_STYLE,
            text: t.label,
            coords: [t.x, height - 10],
          }) as ChartedText,
      )
      .filter((t) => {
        /* Remove mid ticks that overlap with the end ticks */
        const x = getScreenXY(t.coords[0], 0)[0],
          w = measureText(t).width;
        return x - w / 2 > leftTickMaxX && x + w / 2 < rightTickMinX;
      }),
    rt,
    rb,
  ];
}

const getAgePart = (
  date1: number,
  date2: number,
  by?: "years" | "months" | "days" | "hours" | "minutes" | "seconds",
): number | undefined => {
  const diff = +date2 - +date1;

  const years = diff / YEAR,
    months = diff / MONTH,
    days = diff / DAY,
    hours = diff / HOUR,
    minutes = diff / MINUTE,
    seconds = diff / SECOND;

  if (by === "years") {
    return years;
  } else if (by === "months") {
    return months;
  } else if (by === "days") {
    return days;
  } else if (by === "hours") {
    return hours;
  } else if (by === "minutes") {
    return minutes;
  } else if (by === "seconds") {
    return seconds;
  }
};
