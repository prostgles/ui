import { isDefined } from "../../utils";
import type Popup from "./Popup";
import { POPUP_CLASSES, type PopupProps } from "./Popup";

type Args = Pick<PopupProps, "positioning"> & {
  anchorX: number;
  anchorY: number;
  anchorHeight: number;
  anchorWidth: number;
  popup: Popup;
}

export const getPopupSize = (popup: Popup) => {
  if(!popup.ref) return undefined;
  const rootChild = popup.ref.querySelector<HTMLElement>(`:scope > .${POPUP_CLASSES.rootChild}`) ?? undefined;
  const contentRef = rootChild?.querySelector<HTMLElement>(`:scope > .${POPUP_CLASSES.content}`) ?? undefined;
  const titleRef = rootChild?.querySelector<HTMLElement>(`:scope > header.${POPUP_CLASSES.title}`) ?? undefined;
  const footerRef = popup.ref.querySelector<HTMLElement>(`:scope > footer`) ?? undefined;

  const size = [titleRef, contentRef, footerRef]
    .filter(isDefined)
    .reduce((a, { offsetHeight, offsetWidth, scrollHeight, scrollWidth }) => ({
      ...a,
      width: Math.max(a.width, offsetWidth, scrollWidth),
      height: a.height + Math.max(offsetHeight, scrollHeight),
    }), { width: 0, height: 0 });

  return size;
}

export const getPopupPosition = ({ positioning, anchorX, anchorY, anchorHeight, popup }: Args) => {
  let x = Math.round(anchorX);
  let y = Math.round(anchorY + anchorHeight);
  const contentSize = getPopupSize(popup);
  if(!contentSize) return;
  const { width, height } = contentSize;
  
  const contentHeight = Math.round(height);
  const contentWidth = Math.round(width);
  const widthOverflow = x + contentWidth - window.innerWidth;
  const heightOverflow = y + contentHeight - window.innerHeight;
  let right: number | undefined;
  let bottom: number | undefined;
  if(widthOverflow > 0){
    x -= widthOverflow;
    right = 0;
  }
  if(heightOverflow > 0){
    y -= heightOverflow;
    bottom = 0;
  }

  x = Math.max(0, x);
  y = Math.max(0, y);

  /**
   * Ensure content window does not decrease in size for better UX (fixedTopLeft effectively)
   */
  const justToggledFullScreen = Date.now() - popup.toggledFullScreen < 100;
  if(popup.position && !popup.state.fullScreen && !justToggledFullScreen){
    x = Math.min(x, popup.position.x);
    y = Math.min(y, popup.position.y);
    popup.position.x = x;
    popup.position.y = y;
  }

  if(!popup.state.fullScreen && !justToggledFullScreen){
    popup.position ??= {
      x,
      y, 
      xMin: x,
      yMin: y,
    }
  }

  const stateStyle = {
    top: `${y}px`,
    left: `${x}px`,
    right: isDefined(right) ? `${right}px` : undefined,
    bottom: isDefined(bottom) ? `${bottom}px` : undefined,
  }

  popup.setState({
    prevStateStyle: { ...popup.state.stateStyle },
    stateStyle,
  });
}