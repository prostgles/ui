import React from "react";
import { Icon } from "./Icon/Icon";
import { FlexRowWrap } from "./Flex";

type P = {
  icon?: string;
  label?: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: React.DOMAttributes<HTMLDivElement>["onClick"];

  labelClassName?: string;
  labelStyle?: React.CSSProperties;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  noContentWrapper?: boolean;
};

export const LabeledRow = (p: P) => {
  return (
    <div
      className={
        "LabeledRow " + (p.className || "") + " flex-row-wrap ai-center "
      }
      style={p.style}
      title={p.title}
      onClick={p.onClick}
    >
      <div
        className={
          "flex-row gap-p5 text-1 ai-center " + (p.labelClassName ?? "")
        }
        style={p.labelStyle}
      >
        {p.icon && <Icon path={p.icon} className="text-2" />}
        {p.label}
      </div>
      {p.noContentWrapper ?
        p.children
      : <FlexRowWrap
          className={"px-p5 font-medium gap-p5 " + (p.contentClassName ?? "")}
          style={p.contentStyle}
        >
          {p.children}
        </FlexRowWrap>
      }
    </div>
  );
};
