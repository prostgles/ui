import { mdiChevronDown } from "@mdi/js";
import React, { useState } from "react";
import type { BtnProps } from "./Btn";
import Btn from "./Btn";

type ExpandSectionProps = {
  expanded?: boolean;
  title?: string;
  children: JSX.Element | React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  iconPath?: string | ((collapsed: boolean) => string);
  collapsible?: boolean;
  buttonProps?: Omit<BtnProps<void>, "onClick">;
};

export const ExpandSection = ({
  expanded = false,
  children,
  className = "",
  style,
  title = "Expand",
  label,
  iconPath: piconP,
  collapsible = false,
  buttonProps,
}: ExpandSectionProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState(!expanded);
  const iconPath = piconP ?? mdiChevronDown;

  const button = (
    <Btn
      iconPosition={piconP ? "left" : "right"}
      className={className + " flex-row "}
      style={style}
      variant="text"
      title={title}
      iconPath={typeof iconPath === "string" ? iconPath : iconPath(collapsed)}
      children={label}
      {...(buttonProps as any)}
      onClick={() => {
        setCollapsed(!collapsed);
      }}
    />
  );

  if (collapsed && !collapsible) return button;
  return (
    <>
      {!collapsed && children}
      {collapsible && button}
    </>
  );
};
