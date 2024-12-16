import type Popup from "./Popup";
import type { PopupState } from "./Popup";
import { POPUP_CLASSES, POPUP_ZINDEX } from "./Popup";
import { getPopupPosition, getPopupSize } from "./getPopupPosition";

const rightPanelStyle: React.CSSProperties = {
  padding: 0,
  top: 0,
  right: 0,
  bottom: 0,
  width: "fit-content",
  maxHeight: "100%", // window.isIOSDevice? `calc(100vh - 100px)` : `calc(100% - 3em)`,
  borderRadius: 0,
  maxWidth: "100vw",
  // maxHeight: `100%`
};

export const popupCheckPosition = function (this: Popup) {
  if (!this.mounted || !this.el.isConnected) return;

  const {
    anchorEl,
    anchorPadding = 0,
    anchorXY,
    positioning,
    persistInitialSize,
    fixedTopLeft = true,
  } = this.props;
  const persistInitialSizeInvalid = () => {
    if (!persistInitialSize) return;
    console.warn(
      "Popup: persistInitialSize=true only works with a content-dependant positioning",
    );
  };

  const commonState: React.CSSProperties = {
    opacity: 1,
    zIndex: POPUP_ZINDEX,
    position: "fixed",
  };

  /**
   * Center positioning if nothing specified
   */
  if (!positioning && !anchorXY && this.ref) {
    const { offsetHeight, offsetWidth } = this.ref;
    /**
     * https://stackoverflow.com/questions/6411361/webkit-based-blurry-distorted-text-post-animation-via-translate3d
     */
    const offsetToReduceChromeBlur = 0.5;
    const x = Math.round(offsetWidth / 2);
    const y = Math.round(offsetHeight / 2) + offsetToReduceChromeBlur;
    this.setState({
      stateStyle: {
        ...commonState,
        transform: `translate(-${x}px, -${y}px)`,
        left: "50%",
        top: "50%",
      },
    });
    persistInitialSizeInvalid();
    return;
  }

  /** Non content-dependant positioning */
  if (positioning === "fullscreen") {
    this.setState({ stateStyle: { inset: 0, position: "absolute" } });
    persistInitialSizeInvalid();
    return;
  } else if (positioning === "as-is" || positioning === "right-panel") {
    this.setState({
      stateStyle: {
        ...commonState,
        ...(positioning === "right-panel" ? rightPanelStyle : {}),
      },
    });
    persistInitialSizeInvalid();
    return;
  }

  const size = getPopupSize(this);
  if (!this.ref || !size) return;

  const { height, width } = size;
  // const firstChild = this.ref.firstChild as HTMLElement;
  // if(!firstChild.classList.contains(POPUP_CLASSES.rootChild)) {
  //   throw new Error("Popup: unexpected rootChild");
  // }
  // const { scrollWidth, scrollHeight } = firstChild;
  // let { scrollWidth: width, scrollHeight: height } = this.ref;
  // const fitContentPositioning = !persistInitialSize;
  // if(fitContentPositioning){
  //   width = scrollWidth;
  //   height = scrollHeight;
  // }

  // IS THIS STILL THE CASE?
  /** Prevent jitter loop */
  // if (width > 100) width += 22;
  // if (height > 100) height += 22;

  const minPadding = window.innerWidth > 900 ? 10 : 0;

  /** If popup content overflows remove margins */
  const PADDING_X = window.innerWidth < width ? 0 : minPadding;
  const PADDING_Y = window.innerHeight < height ? 0 : minPadding;

  let anchorX = 0,
    anchorY = 0,
    anchorWidth = 0,
    anchorHeight = 0;

  if (anchorXY) {
    anchorX = anchorXY.x;
    anchorY = anchorXY.y;
  } else if (anchorEl) {
    const anchorR = anchorEl.getBoundingClientRect();
    anchorX = anchorR.x - anchorPadding;
    anchorY = anchorR.y - anchorPadding;
    anchorHeight = anchorR.height + 2 * anchorPadding;
    anchorWidth = anchorR.width + 2 * anchorPadding;
  } else {
    anchorX = (window.innerWidth - width) / 2;
    anchorY = (window.innerHeight - height) / 2;

    if (positioning && !["top-center", "center"].includes(positioning)) {
      console.warn(
        "Popup positioning provided without an anchorEl or anchorXY",
      );
    }
  }

  let x = anchorX;
  let y = anchorY;
  const xLeft = Math.max(0, anchorX);
  const xCenter = Math.max(0, anchorX + anchorWidth / 2);

  if (positioning === "center") {
    y = 0.5 * (window.document.body.offsetHeight - height);
    x = 0.5 * (window.document.body.offsetWidth - width);
  } else if (positioning === "top-center") {
    y = 50;
    x = 0.5 * (window.document.body.offsetWidth - width);
  } else if (positioning === "beneath-center") {
    y = anchorY + anchorHeight;
    x = xCenter - width / 2;
  } else if (
    positioning === "beneath-left" ||
    positioning === "beneath-left-minfill"
  ) {
    if (positioning === "beneath-left") {
      return getPopupPosition({
        positioning,
        anchorX,
        anchorHeight,
        anchorWidth,
        anchorY,
        popup: this,
      });
    }
    y = anchorY + anchorHeight;
    x = xLeft;
  } else if (positioning === "beneath-right") {
    y = anchorY + anchorHeight;
    x = anchorX + anchorWidth - width;

    /* Bottom left of point */
  } else if (positioning === "tooltip") {
    y = anchorY + PADDING_Y;
    x = anchorX - PADDING_X - width;
  } else if (
    positioning === "inside-top-center" ||
    positioning === "above-center"
  ) {
    x = xCenter;
    y = anchorY || 0;

    if (positioning === "above-center") {
      y = anchorY - height;
    }
  }

  /* Right side is out of screen */
  let right: number | undefined;
  if (x + width + PADDING_X > window.innerWidth) {
    x = Math.max(PADDING_X, window.innerWidth - width - PADDING_X);
    right = 0;
  } else if (x < 0) {
    x = PADDING_X;
  }

  /* Bottom side is out of screen */
  let bottom: number | undefined;
  const bottomOverflow = y + height + PADDING_Y - window.innerHeight;

  // TODO ensure that this is + fixedTopLeft overflow compensation logic does not loop
  if (bottomOverflow > 0) {
    if (bottomOverflow < height / 9) {
      bottom = PADDING_Y;
    }
    y = Math.max(PADDING_Y, window.innerHeight - height - PADDING_Y);
  } else if (y < 0) {
    y = PADDING_Y;
  }

  if (this.position?.x !== x || this.position.y !== y || bottom) {
    this.position ??= { x, y, xMin: x, yMin: y };
    // This makes popup height grow to max
    if (fixedTopLeft) {
      this.position.xMin = Math.round(Math.min(this.position.xMin, x));
      this.position.yMin = Math.round(Math.min(this.position.yMin, y));
      x = this.position.xMin;
      y = this.position.yMin;
    }
    this.position.x = x;
    this.position.y = y;

    const left = `${Math.round(x)}px`;
    const newState: PopupState = {
      stateStyle: {
        ...commonState,
        ...(Number.isFinite(bottom) && { bottom: `${bottom}px` }),
        ...(Number.isFinite(right) ?
          {
            right,
            // ...(fixedTopLeft && { left }), // This makes popup width grow to max
          }
        : { left }),
        top: `${Math.round(y)}px`,
      },
    };

    if (persistInitialSize) {
      newState.stateStyle.width = `${width}px`;
      newState.stateStyle.height = `${height}px`;
      /** If content width is less than anchor then fill width */
    } else if (
      positioning?.endsWith("-minfill") &&
      anchorWidth &&
      width < anchorWidth
    ) {
      newState.stateStyle.width = `${anchorWidth}px`;
    } else if (positioning?.endsWith("-fill")) {
      newState.stateStyle.width = `${anchorWidth}px`;
    }
    // TODO - add a better way to prevent height recursion when deleting computed columns from Linked column (beneath-left positioning)
    // if(isEqual(newState.stateStyle, this.prevStateStyles[1])) return;

    this.setState(newState);
    this.prevStateStyles.unshift(newState.stateStyle);
    this.prevStateStyles = this.prevStateStyles.slice(0, 3);
  }
};
