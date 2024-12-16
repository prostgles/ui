import type { AnyObject } from "prostgles-types";
import React, { useState } from "react";
import type { Command } from "../Testing";
import type { PopupProps } from "./Popup/Popup";
import Popup, { POPUP_ZINDEX } from "./Popup/Popup";

type P<State extends AnyObject> = {
  button: React.ReactNode;
  render?: (
    close: () => void,
    state: State,
    setState: (newState: Partial<State>) => void,
  ) => React.ReactNode;
  footer?: (close: VoidFunction) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  initialState?: State;

  /**
   * If true then will increase button zIndex when popup is open
   */
  raiseButton?: boolean;
};

export default function <S extends AnyObject>(
  props: P<S> & Partial<Omit<PopupProps, "footer">>,
) {
  const [ref, setRef] = useState<HTMLElement | null>();
  const [refBtn, setRefBtn] = useState<HTMLElement>();
  const {
    render,
    content,
    style = {},
    className = "",
    onClickClose,
    initialState = {},
    footer,
    onClose,
    raiseButton,
    ...otherProps
  } = props;

  const [state, setState] = useState<S>(initialState as S);

  const open = Boolean(ref);

  const popupClose = () => setRef(null);
  let _content: React.ReactNode = null;
  if (ref) {
    _content = (
      <Popup
        positioning="inside"
        {...otherProps}
        onClose={(e) => {
          {
            onClose?.(e);
            setRef(null);
          }
        }}
        onClickClose={onClickClose ?? !render}
        content={
          render ?
            render(popupClose, state, (newState) =>
              setState({ ...state, ...(newState as any) }),
            )
          : ((content || props.children) as React.ReactChild)
        }
        footer={footer?.(popupClose)}
        anchorEl={refBtn}
      />
    );
  }

  return (
    <>
      <div
        ref={(e) => {
          if (e) {
            setRefBtn(e);
          }
        }}
        style={{
          ...style,
          ...(raiseButton && open && { zIndex: POPUP_ZINDEX + 1 }),
        }}
        className={"PopupMenu_triggerWrapper h-fit w-fit " + className}
        data-command={
          open ? undefined : (
            (props["data-command"] satisfies Command | undefined)
          )
        }
        onClick={(e) => {
          if (refBtn?.contains(e.nativeEvent.target as HTMLElement)) {
            setRef(e.nativeEvent.target as HTMLElement);
          } else {
            setRef(null);
          }
        }}
      >
        {props.button}
      </div>
      {_content}
    </>
  );
}
