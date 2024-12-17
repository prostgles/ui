import React, { useEffect, useRef, useState } from "react";
import Popup from "./Popup/Popup";

type P = {
  children: React.ReactNode;
  tooltip: React.ReactNode;
};
export const Tooltip = ({ children, tooltip }: P) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onMouseEnter = (ev: MouseEvent) => {
      setOpen(true);
    };
    const onMouseLeave = (ev: MouseEvent) => {
      setOpen(false);
    };

    const el = ref.current;
    el?.addEventListener("mouseenter", onMouseEnter);
    el?.addEventListener("mouseleave", onMouseLeave);

    return () => {
      el?.removeEventListener("mouseenter", onMouseEnter);
      el?.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [setOpen]);

  return (
    <>
      <span ref={ref} style={open ? { cursor: "help", opacity: 0.8 } : {}}>
        {children}
      </span>
      {ref.current && open && (
        <Popup
          anchorEl={ref.current}
          anchorPadding={20}
          positioning="above-center"
          clickCatchStyle={{ opacity: 0 }}
          onClickClose={false}
        >
          {tooltip}
        </Popup>
      )}
    </>
  );
};
