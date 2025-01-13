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
  let rStyle = {};
  if (positioning === "tooltip") {
    rStyle = {
      pointerEvents: "none",
      touchAction: "none",
    };
  }
  let style: React.CSSProperties = {
    maxWidth: "100vw",
    maxHeight: "100vh",
    outline: "none",
    position: "fixed",
    // clipPath: "circle(1% at 50% 10%)",
    // transition: "clip-path .5s",
    zIndex: POPUP_ZINDEX,
    padding: 0,
    borderRadius: ".5em",
    ...rStyle,
    ...stateStyle,
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
        "inset",
        "width",
        "height",
      ]),
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100vh",
    };
  }

  if (collapsed) {
    style = omitKeys(style, ["bottom", "height"]);
  }

  return style;
};
