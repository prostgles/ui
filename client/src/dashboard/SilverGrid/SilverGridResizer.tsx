import { setPan } from "../setPan";
import React from "react";

import { vibrateFeedback } from "../Dashboard/dashboardUtils";
import RTComp from "../RTComp";
import type { LayoutItem } from "./SilverGrid";
import { isTouchDevice } from "./SilverGrid";

type LayoutSize = Pick<LayoutItem, "id" | "size">;

type SilverGridResizerProps = {
  type: "row" | "col";
  onChange: (prev: LayoutSize, next: LayoutSize) => void;
  layoutMode: "fixed" | "editable";
};

export class SilverGridResizer extends RTComp<
  SilverGridResizerProps,
  Record<string, never>,
  any
> {
  sizes?: {
    prev: LayoutSize;
    next: LayoutSize;
  };

  cleanupListeners?: VoidFunction;
  onDelta() {
    const { onChange, layoutMode } = this.props;
    const ref = this.ref as any;
    if (this.cleanupListeners && layoutMode === "fixed") {
      this.cleanupListeners();
    }
    if (!ref || ref?._hasListeners) return;
    ref._hasListeners = true;
    this.cleanupListeners = setPan(this.ref!, {
      onPanEnd: () => {
        const { prev, next } = this.sizes!;
        onChange(prev, next);
        this.sizes = undefined;
      },
      onPanStart: () => {},
      onRelease: () => {
        this.ref!.style.background = "transparent";
      },
      onPress: () => {
        this.ref!.style.background = "#00e1cc";
        vibrateFeedback(15);
      },
      onPan: (p) => {
        if (!this.ref) throw "ref missing";
        const { type } = this.props;
        const { nextElementSibling, previousElementSibling, parentElement } =
            this.ref,
          nextS: HTMLElement = nextElementSibling as HTMLElement,
          prevS: HTMLElement = previousElementSibling as HTMLElement,
          prevRect = prevS.getBoundingClientRect(),
          nextRect = nextS.getBoundingClientRect(),
          leftOffset = prevRect.x,
          rightOffset = nextRect.x + nextRect.width,
          topOffset = prevRect.y,
          bottomOffset = nextRect.y + nextRect.height;

        let prevFlex, nextFlex;

        const rWh = this.ref.getBoundingClientRect().width / 2,
          rHh = this.ref.getBoundingClientRect().height / 2,
          pFlex = +getComputedStyle(prevS).flexGrow,
          nFlex = +getComputedStyle(nextS).flexGrow,
          totalFlex = pFlex + nFlex;
        if (type === "row") {
          const pxPerFlex = (prevRect.width + nextRect.width) / totalFlex;

          prevFlex = (p.x - leftOffset - rWh) / pxPerFlex;
          nextFlex = totalFlex - prevFlex;
        } else {
          const pxPerFlex = (prevRect.height + nextRect.height) / totalFlex;

          (prevFlex = (p.y - topOffset - rHh) / pxPerFlex),
            (nextFlex = totalFlex - prevFlex);
        }

        prevS.style.flex = `${prevFlex}`;
        nextS.style.flex = `${nextFlex}`;

        this.sizes = {
          prev: { id: prevS.dataset["boxId"]!, size: prevFlex },
          next: { id: nextS.dataset["boxId"]!, size: nextFlex },
        };
      },
    });
  }

  ref?: HTMLDivElement;
  render() {
    const isFixed = this.props.layoutMode === "fixed";
    const size =
      isFixed ? "1em"
      : isTouchDevice() ? "20px"
      : "4px";
    const { type } = this.props,
      style: React.CSSProperties = {
        width: type === "col" ? "100%" : size,
        height: type === "col" ? size : "100%",
        cursor:
          isFixed ? "default"
          : type === "col" ? "ns-resize"
          : "ew-resize",
        opacity: 0.4,
        zIndex: 2,
        margin:
          isTouchDevice() ?
            type !== "col" ?
              "0 -8px"
            : "-8px 0"
          : "",
      };

    return (
      <div
        ref={(r) => {
          if (r) this.ref = r;
        }}
        style={style}
        className={"silver-grid-resizer noselect "}
      />
    );
  }
}
