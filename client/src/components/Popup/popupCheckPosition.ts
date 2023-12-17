import Popup, { POPUP_ZINDEX, PopupState } from "./Popup";

const rightPanelStyle: React.CSSProperties = { 
  padding: 0, 
  top: 0, 
  right: 0,
  bottom: 0,
  width: "fit-content",
  maxHeight: "100%",// window.isIOSDevice? `calc(100vh - 100px)` : `calc(100% - 3em)`,
  borderRadius: 0,
  maxWidth: "100vw",
  // maxHeight: `100%` 
}

export const popupCheckPosition = function (this: Popup) {
  if (!this.mounted) return;

  const { anchorEl, anchorPadding = 0, anchorXY, positioning, persistInitialSize, fixedTopLeft = true } = this.props;
  const persistInitialSizeInvalid = () => {
    if (!persistInitialSize) return;
    console.warn("Popup: persistInitialSize=true only works with a content-dependant positioning")
  }
  const contentRect = this.ref?.getBoundingClientRect();
  const commonState: React.CSSProperties = {
    opacity: 1,
    zIndex: POPUP_ZINDEX,
    position: "fixed",
  }

  if (!positioning && !anchorXY && this.ref) {
    const { offsetHeight, offsetWidth } = this.ref;
    this.setState({
      stateStyle: {
        ...commonState,
        /** Actual pixels used to reduce aliasing blur */
        transform: `translate(-${Math.round(offsetWidth / 2)}px, -${Math.round(offsetHeight / 2)}px)`,
        left: "50%",
        top: "50%",
      }
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
        ...(positioning === "right-panel" ? rightPanelStyle : {})
      }
    });
    persistInitialSizeInvalid();
    return;
  }

  if (this.ref && contentRect) {
    // const { width, height } = contentRect;
    let { scrollWidth: width, scrollHeight: height } = this.ref;

    /** Prevent jitter loop */
    if (width > 100) width += 22;
    if (height > 100) height += 22;

    const minPadding = window.innerWidth > 900 ? 10 : 0;
    const PADDING_X = (window.innerWidth < width) ? 0 : minPadding,
      PADDING_Y = (window.innerHeight < height) ? 0 : minPadding;

    let anchorX = 0, anchorY = 0, anchorW = 0, anchorH = 0;

    if (anchorXY) {
      anchorX = anchorXY.x;
      anchorY = anchorXY.y;
    } else if (anchorEl) {
      const anchorR = anchorEl.getBoundingClientRect();
      anchorX = anchorR.x - anchorPadding;
      anchorY = anchorR.y - anchorPadding;
      anchorH = anchorR.height + 2 * anchorPadding;
      anchorW = anchorR.width + 2 * anchorPadding;
    } else {
      anchorX = (window.innerWidth - width) / 2
      anchorY = (window.innerHeight - height) / 2

      if (positioning && !["top-center", "center"].includes(positioning)) {
        console.warn("Popup positioning provided without an anchorEl or anchorXY")
      }
    }

    let x = anchorX;
    let y = anchorY;
    const xLeft = Math.max(0, anchorX);
    const xCenter = Math.max(0, anchorX + (anchorW / 2));

    if (positioning === "center") {      
      y = .5 * (window.document.body.offsetHeight - height);
      x = .5 * (window.document.body.offsetWidth - width);

    } else if (positioning === "top-center") {
      y = 50;
      x = .5 * (window.document.body.offsetWidth - width)

    } else if (positioning === "top-fill") {
      y = anchorY;
      x = xLeft;

    } else if (positioning === "beneath-fill") {
      y = anchorY + anchorH;
      x = xCenter;

    } else if (positioning === "beneath-center") {
      y = anchorY + anchorH;
      x = xCenter - width / 2;

    } else if (positioning === "beneath-left" || positioning === "beneath-left-minfill") {
      y = anchorY + anchorH;
      x = xLeft;

    } else if (positioning === "beneath-right") {
      y = anchorY + anchorH;
      x = anchorX + anchorW - width

      /* Bottom left of point */
    } else if (positioning === "tooltip") {
      y = anchorY + PADDING_Y;
      x = anchorX - PADDING_X - width;
    } else if (positioning === "inside-top-center" || positioning === "above-center") {
      x = xCenter;
      y = anchorY || 0;

      if (positioning === "above-center") {
        y = anchorY - height
      }
    }

    /* Right side is out of screen */
    let right: number | undefined;
    if (x + width + PADDING_X > window.innerWidth) {
      x = Math.max(PADDING_X, window.innerWidth - width - PADDING_X);
      right = 0;
    } else if (x < 0) {
      x = PADDING_X
    }

    /* Bottom side is out of screen */
    let bottom: number | undefined;
    const bottomOverflow = y + height + PADDING_Y - window.innerHeight
    if (bottomOverflow > 0) {

      if (positioning?.includes("beneath") && bottomOverflow < height / 9) {
        bottom = PADDING_Y;
      } else {

        y = Math.max(PADDING_Y, window.innerHeight - height - PADDING_Y);
      }

    } else if (y < 0) {
      y = PADDING_Y;
    }

    if (this.position?.x !== x || this.position.y !== y || bottom) {
      this.position ??= { x, y, xMin: x, yMin: y };
      if (fixedTopLeft) {
        this.position.xMin = Math.round(Math.min(this.position.xMin, x));
        this.position.yMin = Math.round(Math.min(this.position.yMin, y));
        x = this.position.xMin;
        y = this.position.yMin;
      }
      this.position.x = x;
      this.position.y = y;

      if (!this.el.isConnected) return;

      const left = `${Math.round(x)}px`;
      const newState: PopupState = {
        stateStyle: {
          ...commonState,
          ...(Number.isFinite(bottom) && { bottom: `${bottom}px` }),
          ...(Number.isFinite(right) ? { 
            right,
            // ...(fixedTopLeft && { left }), // This makes popup width grow to max
          } : { left }),
          top: `${Math.round(y)}px`,
        }
      };

      if (this.props.persistInitialSize) {
        newState.stateStyle.width = `${contentRect.width}px`;
        newState.stateStyle.height = `${contentRect.height}px`;
        /** If content width is less than anchor then fill width */
      } else if (positioning?.endsWith("-minfill") && anchorW && width < anchorW) {
        newState.stateStyle.width = `${anchorW}px`;
      } else if (positioning?.endsWith("-fill")) {
        newState.stateStyle.width = `${anchorW}px`;
      }

      this.setState(newState)
    }

  }

}