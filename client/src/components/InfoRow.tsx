import { mdiInformationOutline } from "@mdi/js";
import Icon from "@mdi/react";
import React from "react";

type InfoRowProps = Pick<React.HTMLAttributes<HTMLDivElement>, "style" | "className" | "children"> & {
  variant?: "filled" | "naked";
  color?: "warning" | "danger" | "info" | "action";
  iconPath?: string;
  iconSize?: number;
}
export function InfoRow(props: InfoRowProps){
  const { className, iconPath = mdiInformationOutline, style = {}, variant, children, color = "warning", iconSize = 1.25 } = props;

  let rootClass = "";
  const bgColor = color === "info"? "default" : color;
  if(variant === "filled"){
    rootClass = `b b-${bgColor} text-${bgColor} bg-${bgColor} px-1 py-p75`;
  } else if(variant === "naked"){
    rootClass = `text-${bgColor} `
  } else {
    rootClass = `b b-${bgColor} text-${bgColor} px-1 py-p75`
  }
  
  return <div className={ ` rounded flex-row ai-start ta-left ${rootClass} ` + className} style={style}>
    {iconPath && iconPath.length > 0 && <Icon path={iconPath} size={iconSize} className="f-0" style={{ marginRight: "10px" }} />}
    <div className="min-s-0 f-1 as-center" style={{ whiteSpace: "pre-line" }}>{children}</div>
  </div>

}