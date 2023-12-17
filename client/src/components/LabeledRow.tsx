import React from "react";
import { Icon } from "./Icon/Icon";

type P = {
  icon?: string;
  label?: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;

  labelClassName?: string;
  labelStyle?: React.CSSProperties;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  noContentWrapper?: boolean;
}

export const LabeledRow = (p: P) => {
  
  return <div 
    className={"LabeledRow " + (p.className || "") + " flex-row-wrap ai-center "} 
    style={p.style} 
    title={p.title}
  >
    <div className={"flex-row gap-p5 text-1 ai-center " + (p.labelClassName ?? "")} style={p.labelStyle}>
      {p.icon && <Icon path={p.icon} className="text-gray-400" />}  
      {p.label}
    </div>
    {p.noContentWrapper? p.children : <div className={"px-p5 font-medium " + (p.contentClassName ?? "")} style={p.contentStyle}>
      {p.children}
    </div>}
  </div>
  
}