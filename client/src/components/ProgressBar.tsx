import React from "react";
import "./ProgressBar.css";
import type { DivProps } from "./Flex";
import { classOverride } from "./Flex";

type P = {
  message?: React.ReactNode;
  value: number;
  totalValue: number;
  variant?: "responsive-barchart";
};
export const MINI_BARCHART_COLOR = "#05b0df";

export const ProgressBar = ({ message, value, totalValue, variant }: P) => {
  const isBarchart = variant === "responsive-barchart";
  const perc = totalValue > value ? Math.round((100 * value) / totalValue) : -1;
  const lightColor = "#ddf8ff";
  const height = isBarchart ? 8 : 2;
  const progressBar = (
    <div
      className={isBarchart ? "shadow" : ""}
      style={{
        borderRadius: `${height / 2}px`,
        height: `${height}px`,
        ...(isBarchart ?
          {
            background: MINI_BARCHART_COLOR,
            flex: 1,
            minHeight: `${height}px`,
            width: `${perc}%`,
          }
        : {
            backgroundImage:
              perc > -1 ?
                `linear-gradient(90deg,  ${MINI_BARCHART_COLOR} 0%, ${MINI_BARCHART_COLOR} ${perc}%, ${lightColor} ${perc}%, ${lightColor})`
              : `linear-gradient(90deg,  ${MINI_BARCHART_COLOR} 40%,  ${lightColor} 40%, ${lightColor})`,
            width: "200px",
            animation:
              perc > -1 ? undefined : (
                "indeterminateAnimation 1s infinite linear"
              ),
          }),
      }}
    ></div>
  );

  // const text = !status.loading?.loaded? "Preparing..." : `Uploaded ${bytesToSize(status.loading.loaded ?? 0)}`;
  return (
    <div className="ProgressBar flex-col gap-p25">
      {progressBar}
      <div className={"text-1 " + (isBarchart ? "ta-left" : "")}>{message}</div>
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
  const perc = +value > +min ? Math.round((100 * valDelta) / delta) : -1;
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
