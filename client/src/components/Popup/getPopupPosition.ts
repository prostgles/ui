import { isDefined } from "../../utils/utils";
import type Popup from "./Popup";
import { POPUP_CLASSES } from "./Popup";

type Args = {
  anchorX: number;
  anchorY: number;
  anchorHeight: number;
  anchorWidth: number;
  popup: Popup;
  opacity: number;
};

export const getPopupSize = (popup: Popup) => {
  if (!popup.ref) return undefined;
  const rootChild =
    popup.ref.querySelector<HTMLElement>(
      `:scope > .${POPUP_CLASSES.rootChild}`,
    ) ?? undefined;
  const contentRef =
    rootChild?.querySelector<HTMLElement>(
      `:scope > .${POPUP_CLASSES.content}`,
    ) ?? undefined;
  const titleRef =
    rootChild?.querySelector<HTMLElement>(
      `:scope > header.${POPUP_CLASSES.title}`,
    ) ?? undefined;
  const footerRef =
    popup.ref.querySelector<HTMLElement>(`:scope > footer`) ?? undefined;
  if (!rootChild) return undefined;

  /** Account for border to ensure there isn't a 2px overflow */
  const style = window.getComputedStyle(popup.ref);
  const bTop = Number(style.getPropertyValue(`border-top-width`).slice(0, -2));
  const bRight = Number(
    style.getPropertyValue(`border-right-width`).slice(0, -2),
  );
  const bBottom = Number(
    style.getPropertyValue(`border-bottom-width`).slice(0, -2),
  );
  const bLeft = Number(
    style.getPropertyValue(`border-left-width`).slice(0, -2),
  );

  const { width: widthWithoutB, height: heightWithoutB } = [
    titleRef,
    contentRef,
    footerRef,
  ]
    .filter(isDefined)
    .reduce(
      (a, { offsetHeight, offsetWidth, scrollHeight, scrollWidth }) => ({
        ...a,
        width: Math.max(a.width, offsetWidth, scrollWidth),
        height: a.height + Math.max(offsetHeight, scrollHeight),
      }),
      { width: 0, height: 0 },
    );
  const width = widthWithoutB + bLeft + bRight;
  const height = heightWithoutB + bTop + bBottom;
  const size = {
    width: Math.max(width, popup.prevSize?.width ?? 0),
    height: Math.max(height, popup.prevSize?.height ?? 0),
  };
  popup.prevSize = size;
  return size;
};

export const getPopupPosition = ({
  opacity,
  anchorX,
  anchorY,
  anchorHeight,
  popup,
}: Args) => {
  let x = Math.round(anchorX);
  let y = Math.round(anchorY + anchorHeight);
  const contentSize = getPopupSize(popup);
  if (!contentSize) return;
  const { width, height } = contentSize;

  const contentHeight = Math.round(height);
  const contentWidth = Math.round(width);
  const widthOverflow = x + contentWidth - window.innerWidth;
  const heightOverflow = y + contentHeight - window.innerHeight;
  if (widthOverflow > 0) {
    x -= widthOverflow;
  }
  if (heightOverflow > 0) {
    y -= heightOverflow;
  }

  x = Math.max(0, x);
  y = Math.max(0, y);

  /**
   * Ensure content window does not decrease in size for better UX (fixedTopLeft effectively)
   */
  const justToggledFullScreen = Date.now() - popup.toggledFullScreen < 100;
  if (popup.position && !popup.state.fullScreen && !justToggledFullScreen) {
    x = Math.min(x, popup.position.x);
    y = Math.min(y, popup.position.y);
    popup.position.x = x;
    popup.position.y = y;
  }

  if (!popup.state.fullScreen && !justToggledFullScreen) {
    popup.position ??= {
      opacity,
      x,
      y,
      xMin: x,
      yMin: y,
    };
  }

  const top = `${y}px`;
  const left = `${x}px`;
  const stateStyle = {
    top,
    left,
    maxHeight: `calc(100vh - ${top})`,
    maxWidth: `calc(100vw - ${left})`,
    /** This prevents a weird slow height growth for position beneath */
    ...(heightOverflow > 0 && {
      bottom: 0,
    }),
    ...(widthOverflow > 0 && {
      right: 0,
    }),
  };

  popup.setState({
    prevStateStyle: { ...popup.state.stateStyle },
    stateStyle,
  });
};
