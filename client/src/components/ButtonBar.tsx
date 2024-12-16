import React from "react";
import type { BtnProps } from "./Btn";
import Btn from "./Btn";
import ErrorComponent from "./ErrorComponent";

type P = {
  error?: any;
  buttons: BtnProps[];
  style?: React.CSSProperties;
  className?: string;
};

export const ButtonBar = ({ buttons, className = "", error, style }: P) => {
  if (!buttons.length && !error) return null;

  return (
    <div
      className={`ButtonBar flex-col ${window.isMobileDevice ? "gap-1" : "gap-2"} ${className}`}
      style={style}
    >
      <ErrorComponent error={error} />
      <div className={"flex-row-wrap py-1 mt-2 gap-2 "}>
        {buttons.map((btnProps, i) => (
          <Btn key={i} {...btnProps} />
        ))}
      </div>
    </div>
  );
};
