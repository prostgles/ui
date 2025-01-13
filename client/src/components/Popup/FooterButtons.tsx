import React from "react";
import type { PopupProps } from "./Popup";
import { Footer } from "./Popup";
import { isDefined, omitKeys } from "prostgles-types";
import Btn, { type BtnProps } from "../Btn";

export type FooterButton =
  | (
      | { node: React.ReactNode }
      | ({
          label: string;
          onClickClose?: boolean;
        } & Omit<BtnProps<void>, "label">)
    )
  | undefined;

type P = Pick<PopupProps, "footerButtons" | "footer" | "onClose"> & {
  className?: string;
  style?: React.CSSProperties;
  error?: any;
};
export const FooterButtons = ({
  footerButtons = [],
  footer,
  onClose,
  ...divProps
}: P) => {
  const bottomBtns = (
    typeof footerButtons === "function" ?
      footerButtons(onClose)
    : footerButtons).filter(isDefined);
  if (!bottomBtns.length && !footer) {
    return null;
  }
  return (
    <Footer {...divProps}>
      {footer}
      {bottomBtns.map((b, i: any) => {
        if ("node" in b)
          return <React.Fragment key={i}>{b.node}</React.Fragment>;
        return (
          <Btn
            key={i}
            {...(omitKeys(b, ["label", "onClickClose", "onClick"]) as any)}
            onClick={(e) => {
              if (b.onClickClose && onClose) onClose(e);
              else if (b.onClick) b.onClick(e);
              else console.error("Button is missing click handler");
            }}
          >
            {b.label}
          </Btn>
        );
      })}
    </Footer>
  );
};
