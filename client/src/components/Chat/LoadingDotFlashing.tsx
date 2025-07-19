import React from "react";
import { classOverride } from "../Flex";

type P = {
  className: string;
  style: React.CSSProperties;
};
export const LoadingDotFlashing = ({ className, style }: P) => {
  return (
    <div style={style} className={classOverride("dot-flashing", className)} />
  );
};
