import { omitKeys } from "prostgles-types";
import { POPUP_ZINDEX, type PopupProps } from "./Popup";

type Args = {
  fullScreen: boolean | undefined;
  collapsed: boolean;
  stateStyle: React.CSSProperties;
  rootStyle: React.CSSProperties;
  positioning: PopupProps["positioning"];
};
export const getPopupStyle = ({
  positioning,
  stateStyle,
  rootStyle,
  collapsed,
  fullScreen,
}: Args) => {
  let style: React.CSSProperties = {
    maxHeight: "100vh",
    outline: "none",
    position: "fixed",
    // clipPath: "circle(1% at 50% 10%)",
    // transition: "clip-path .5s",
    zIndex: POPUP_ZINDEX,
    padding: 0,
    borderRadius: ".5em",
    ...stateStyle,
    maxWidth:
      positioning === "fullscreen" ?
        "100vw"
      : `min(900px, ${stateStyle.maxWidth ?? "100vw"})`,
    ...rootStyle,
  };

  if (fullScreen) {
    style = {
      ...omitKeys(style, [
        "transform",
        "top",
        "left",
        "right",
        "bottom",
        "position",
        "positionAnchor",
        "positionArea",
        "positionTryFallbacks",
        "inset",
        "width",
        "height",
      ]),
      position: "fixed",
      inset: 0,
      width: "100vw",
      maxWidth: "100vw",
      height: "100vh",
    };
  }

  if (collapsed) {
    style = omitKeys(style, ["bottom", "height"]);
  }

  return style;
};
