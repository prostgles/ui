import React from "react"
import { Footer, PopupProps } from "./Popup"
import { isDefined, omitKeys } from "../../utils";
import Btn from "../Btn";

type P = Pick<PopupProps, "footerButtons" | "footer" | "onClose"> & {
  className?: string;
  style?: React.CSSProperties;
};
export const FooterButtons = ({ footerButtons = [], footer, onClose, ...divProps }: P) => {
  const bottomBtns = (typeof footerButtons === "function"? footerButtons(onClose) : footerButtons).filter(isDefined);
  if(!bottomBtns.length && !footer){
    return null;
  }
  return <Footer { ...divProps }>
    {footer}
    {bottomBtns.map((b, i: any) => {
      if("node" in b) return <React.Fragment key={i}>{b.node}</React.Fragment>;
      return (
        <Btn key={i}
          {...omitKeys(b, ["label", "onClickClose", "onClick"])}
          onClick={e => {
            if (b.onClickClose && onClose) onClose(e);
            else if (b.onClick) b.onClick(e);
            else console.error("Button is missing click handler")
          }}
        >{b.label}</Btn>
      )
    })}
  </Footer>
}