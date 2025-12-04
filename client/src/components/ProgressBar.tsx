import React from "react";
import "./ProgressBar.css";
import type { DivProps } from "./Flex";
import { classOverride } from "./Flex";

type P = {
  message?: React.ReactNode;
  style?: React.CSSProperties;
  value: number;
  totalValue: number;
};
export const MINI_BARCHART_COLOR = "var(--active)";

export const ProgressBar = ({ message, value, totalValue, style }: P) => {
  const perc = totalValue > value ? Math.round((100 * value) / totalValue) : -1;
  const lightColor = "var(--bg-action)";
  const height = 4;
  const isIndeterminate = perc === -1;

  return (
    <div className="ProgressBar flex-col gap-p25" style={style}>
      <div
        className="ProgressBarOuter shadow"
        style={{
          background: lightColor,
          overflow: "hidden",
        }}
      >
        <div
          className="ProgressBarInner shadow"
          style={{
            borderRadius: `${height / 2}px`,
            height: `${height}px`,
            background: MINI_BARCHART_COLOR,
            minHeight: `${height}px`,
            minWidth: "2px",
            ...(isIndeterminate ?
              {
                animation: "indeterminateTranslateX 1s infinite linear",
                willChange: "transform",
                width: `${50}%`,
              }
            : {
                width: `${perc}%`,
              }),
          }}
        />
      </div>
      <div className={"text-1 "}>{message}</div>
    </div>
  );
};

type CellBarchartProps = {
  min: number | Date;
  max: number | Date;
  value: number | Date;
  message: React.ReactNode;
  barColor: string | undefined;
  textColor: string | undefined;
} & DivProps;
export const CellBarchart = ({
  min,
  max,
  value,
  message,
  barColor = MINI_BARCHART_COLOR,
  textColor,
  style,
  className,
  ...divProps
}: CellBarchartProps) => {
  const delta = +max - +min;
  const valDelta = +value - +min;
  const perc = Math.round((100 * valDelta) / delta);
  const height = 8;
  return (
    <div
      {...divProps}
      className={classOverride("ProgressBar flex-col gap-p25", className)}
      style={style}
    >
      <div
        className={"shadow"}
        style={{
          borderRadius: `${height / 2}px`,
          height: `${height}px`,
          background: barColor,
          flex: 1,
          minHeight: `${height}px`,
          width: `${perc}%`,
          minWidth: "2px",
        }}
      ></div>
      <div
        className={"text-1 ta-left"}
        style={textColor ? { color: textColor } : undefined}
      >
        {message}
      </div>
    </div>
  );
};
