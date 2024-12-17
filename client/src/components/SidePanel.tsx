import React from "react";
import Popup from "./Popup/Popup";

type P = {
  onClose?: () => any;
  title?: string;
  children: any;
  footerButtons?: JSX.Element | JSX.Element[];
};

export default class SidePanel extends React.Component<P, any> {
  render() {
    const {
      onClose,
      title = "Title",
      children,
      footerButtons = [],
    } = this.props;

    return (
      <Popup
        onClose={onClose}
        positioning="as-is"
        title={title}
        rootStyle={{
          top: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          position: "absolute",
        }}
      >
        {title ?
          <div
            className="text-lg leading-6 font-medium p-1 noselect"
            style={{
              boxShadow: "rgb(64 64 64) 0px -5px 9px 0px",
              clipPath: "inset(0px 0px -10px)",
            }}
          >
            {title}
          </div>
        : null}
        <div className="flex-col f-1 o-auto">{children}</div>
        <div className="flex-row f-0 bt p-1 jc-around">{footerButtons}</div>
      </Popup>
    );
  }
}
