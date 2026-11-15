import { Stopwatch } from "@components/Stopwatch";
import React from "react";

export const StopwatchColumn = ({
  startValue,
  endValue,
}: {
  startValue: unknown;
  endValue: unknown;
}) => {
  const startTime = getTimestampDate(startValue);
  const endTime = getTimestampDate(endValue);
  if (!startTime || endValue === undefined || (endValue !== null && !endTime))
    return null;

  return (
    <Stopwatch
      startTime={startTime}
      endTime={endTime}
      style={{ fontVariantNumeric: "tabular-nums" }}
    />
  );
};

const getTimestampDate = (value: unknown): Date | undefined => {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    !(value instanceof Date)
  )
    return;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
};
