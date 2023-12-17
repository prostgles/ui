import React, { useEffect, useRef, useState } from "react"
import Popup from "./Popup/Popup";

type P = {
  children: React.ReactNode;
  tooltip: React.ReactNode;
}
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

    ref.current?.addEventListener("mouseenter", onMouseEnter);
    ref.current?.addEventListener("mouseleave", onMouseLeave);

    return () => {
      ref.current?.removeEventListener("mouseenter", onMouseEnter);
      ref.current?.removeEventListener("mouseleave", onMouseLeave);
    }
  }, [ref.current, setOpen])


  return <>
    <span ref={ref} style={open? { cursor: "help", opacity: .8 } : {}}>{children}</span>
    {ref.current && open && 
      <Popup 
        anchorEl={ref.current}
        anchorPadding={20}
        positioning="above-center"
        clickCatchStyle={{ opacity: 0 }} 
        onClickClose={false}
      >
        {tooltip}
      </Popup>}
  </>
}