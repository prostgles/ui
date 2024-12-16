import type { AnyObject } from "prostgles-types";
import { getKeys } from "prostgles-types";
import React from "react";
import type { DivProps } from "../../components/Flex";
import { isEmpty } from "prostgles-types";

const SHORT_NAMES = [
  ["years", "y"],
  ["months", "mo"],
  ["weeks", "w"],
  ["days", "d"],
  ["hours", "h"],
  ["minutes", "min"],
  ["seconds", "s"],
  ["milliseconds", "ms"],
] as const;

type PG_Interval = Partial<Record<(typeof SHORT_NAMES)[number][0], number>>;

export const renderInterval = (
  v: AnyObject = {},
  shortVersion = false,
  withAgoText?: boolean,
  excludeMillis = false,
) => {
  let isNegative = false;

  const startIndex = SHORT_NAMES.findIndex(
    ([name]) => Number.isFinite(v[name]) && v[name] !== 0,
  );
  // const endIndex = SHORT_NAMES.slice(0).reverse().find(([name]) => Number.isFinite(v[name]) && v[name] !== 0)
  const intervalText =
    SHORT_NAMES.map(([name, shortName], i) => {
      let val = v[name];
      if (
        i >= startIndex &&
        Number.isFinite(val) &&
        (!excludeMillis || name !== "milliseconds")
      ) {
        isNegative = val < 0;
        if (withAgoText) val = Math.abs(val);
        return `${val}${shortVersion ? shortName : " " + name}`;
      }

      return undefined;
    })
      .filter((v) => v)
      .join(" ") || "0 seconds";

  if (withAgoText) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return `${isNegative ? "In " : ""}${intervalText}${!isNegative ? " ago" : ""}`;
  }

  return intervalText;
};

type StyledIntervalProps = {
  value: PG_Interval;
  mode?: "backups" | "pg_stat" | "full" | "short";
} & Pick<DivProps, "style" | "className">;
export const StyledInterval = ({
  value: v,
  mode = "backups",
  ...divProps
}: StyledIntervalProps) => {
  const colorParts = {
    red: "-red-500",
    yellow: "-yellow-500",
    green: "-green-500",
    gray: "-gray-500",
  };

  const textParts = getShortText(v);
  const shortTextParts =
    mode === "full" ? textParts.slice(0)
    : mode === "short" ? textParts.slice(0, 2)
    : textParts.slice(0, 1);
  const shortText = shortTextParts.join(" ");

  const color =
    mode === "full" || mode === "short" ? colorParts.gray
    : mode === "backups" ?
      isEmpty(v) ? colorParts.gray
      : "milliseconds" in v || "seconds" in v ? colorParts.green
      : "minutes" in v ? colorParts.yellow
      : colorParts.red
    : isEmpty(v) ? colorParts.gray
    : "milliseconds" in v || "seconds" in v || "minutes" in v || "hours" in v ?
      colorParts.green
    : "days" in v || "weeks" in v ? colorParts.yellow
    : colorParts.red;

  return (
    <span
      style={divProps.style}
      title={JSON.stringify(v).slice(1, -1)}
      className={`${divProps.className ?? ""} text${color}`}
    >
      {shortText || "0s"}
      {mode === "backups" ? " ago" : ""}
    </span>
  );
};

const getShortText = (_v: PG_Interval | null) => {
  const v = _v ?? {};
  const res = [
    ...(isEmpty(v) ? [""] : []),
    ...("years" in v && v.years ? [`${v.years}y`] : []),
    ...("months" in v && v.months ? [`${v.months}mo`] : []),
    ...("weeks" in v && v.weeks ? [`${v.weeks}w`] : []),
    ...("days" in v && v.days ? [`${v.days}d`] : []),
    ...("hours" in v && v.hours ? [`${v.hours}h`] : []),
    ...("minutes" in v && v.minutes ? [`${v.minutes}min`] : []),
    ...("seconds" in v && v.seconds ? [`${v.seconds}s`] : []),
    ...("milliseconds" in v && v.milliseconds ? [`${v.milliseconds}ms`] : []),
  ];

  if (!res.length) {
    return getKeys(v).map((k) => `${v[k]} ${k}`);
  }

  return res;
};
