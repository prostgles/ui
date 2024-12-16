import React from "react";
import "./ClickCatchOverlay.css";
import { type DivProps, classOverride } from "./Flex";
import type { Command } from "../Testing";

export const ClickCatchOverlay = ({
  style,
  className,
  onClick,
}: Pick<DivProps, "onClick" | "style" | "className">) => {
  return (
    <div
      data-command={"ClickCatchOverlay" satisfies Command}
      className={classOverride("ClickCatchOverlay", className)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        backdropFilter: "blur(2px)",
        ...style,
      }}
      onClick={onClick}
    />
  );
};
