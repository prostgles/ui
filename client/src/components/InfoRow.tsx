import { mdiInformationOutline } from "@mdi/js";
import React from "react";
import { Icon } from "./Icon/Icon";
import { classOverride } from "./Flex";

type InfoRowProps = {
  variant?: "filled" | "naked";
  color?: "warning" | "danger" | "info" | "action";
  iconPath?: string;
  iconSize?: number;
  style?: React.CSSProperties;
  className?: string;
  contentClassname?: string;
  children?: React.ReactNode;
};
export function InfoRow(props: InfoRowProps) {
  const {
    className,
    iconPath = mdiInformationOutline,
    style = {},
    variant,
    children,
    color = "warning",
    contentClassname = "",
    iconSize = 1.25,
  } = props;

  let rootClass = "";
  const bgColor = color === "info" ? "bg-color-2" : `bg-${color}`;
  const bColor = color === "info" ? "b-color" : `b-${color}`;
  const textColor = color === "info" ? "text-1" : `text-${color}`;
  if (variant === "filled") {
    rootClass = `b ${bColor} ${textColor} ${bgColor} px-1 py-p75`;
  } else if (variant === "naked") {
    rootClass = textColor;
  } else {
    rootClass = `b ${bColor} ${textColor} px-1 py-p75`;
  }

  return (
    <div
      className={classOverride(
        ` rounded flex-row ai-start ta-left ${rootClass} `,
        className,
      )}
      style={style}
    >
      {iconPath && iconPath.length > 0 && (
        <Icon
          path={iconPath}
          size={iconSize}
          className="f-0"
          style={{ marginRight: "10px" }}
        />
      )}
      <div
        className={classOverride("min-s-0 f-1 as-center", contentClassname)}
        style={{ whiteSpace: "pre-line" }}
      >
        {children}
      </div>
    </div>
  );
}
