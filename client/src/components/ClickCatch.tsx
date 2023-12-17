import React from "react";

type P = Pick<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "style" | "className" | "onClick">;

export default class ClickCatch extends React.Component<P, any> {

  clickCatch?: HTMLDivElement;

  render() {
    const { onClick, children, style } = this.props;
    return (
      <div style={{ display: "block", position: "fixed", backgroundColor: "rgb(0 0 0 / .5)", zIndex: 0, ...style }}
        className={"clickcatchcomp fixed noselect inset-0 w-full h-full"}
        ref={e => {
          if (e) this.clickCatch = e;
        }}
        onClick={e => {
          if (e.target === this.clickCatch) {
            onClick?.(e);
          }
        }}
        onContextMenu={e => {
          e.preventDefault();
          if (e.target === this.clickCatch) {
            onClick?.(e);
          }
          return false;
        }}
      >
        {children}
      </div>
    )
  }
}