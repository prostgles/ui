import { FlexCol } from "@components/Flex";
import { Pan } from "@components/Pan";
import React from "react";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";

export type ChildWindowLayoutProps<W extends WindowSyncItem> = {
  w: W;
  childWindow: { node: React.ReactNode; w: WindowSyncItem } | undefined;
  children: React.ReactNode;
};

export const ChildWindowLayout = <W extends WindowSyncItem>({
  w,
  children,
  childWindow,
}: ChildWindowLayoutProps<W>) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const childRef = React.useRef<HTMLDivElement>(null);

  const { position = "bottom" } = childWindow?.w.parent_window_options ?? {};

  const resizeClass =
    position === "top" || position === "bottom" ? "resizing-ns" : "resizing-ew";
  const childWPercentage =
    childWindow?.w.parent_window_options?.sizePercentage ?? 50;
  const childSize =
    resizeClass === "resizing-ew" ?
      { width: childWPercentage + "%" }
    : { height: childWPercentage + "%" };

  const updateSize = useDebouncedCallback(
    (newPerc: number) => {
      if (!childWindow) return;
      childWindow.w.$update(
        {
          parent_window_options: {
            sizePercentage: Math.round(newPerc),
          },
        },
        { deepMerge: true },
      );
    },
    [childWindow?.w],
    1000,
  );

  if (!childWindow) {
    return <>{children}</>;
  }
  if (position === "full") {
    return <>{childWindow.node}</>;
  }
  return (
    <div
      ref={rootRef}
      className="bg-color-1"
      style={{
        display: "flex",
        flex: 1,
        flexDirection:
          position === "top" ? "column"
          : position === "bottom" ? "column-reverse"
          : position === "left" ? "row"
          : "row-reverse",
        height: "100%",
        width: "100%",
      }}
    >
      <FlexCol
        ref={childRef}
        className={
          "f-0 b-color-0 " +
          {
            top: "bb",
            right: "bl",
            bottom: "bt",
            left: "br",
          }[position]
        }
        style={childSize}
      >
        {childWindow.node}
      </FlexCol>
      <Pan
        key={"chart-window-resizer"}
        style={
          resizeClass === "resizing-ew" ?
            {
              height: "100%",
              width: "1px",
              cursor: "ew-resize",
            }
          : {
              width: "100%",
              height: "1px",
              cursor: "ns-resize",
            }
        }
        onPress={(e, node) => {
          node.classList.toggle(resizeClass, true);
        }}
        onRelease={(e, node) => {
          node.classList.toggle(resizeClass, false);
        }}
        onPan={(e) => {
          if (!rootRef.current?.isConnected || !childRef.current) {
            return false;
          }
          if (resizeClass === "resizing-ew") {
            const left = rootRef.current.getBoundingClientRect().left;
            const newWidth = e.x - left;
            const p =
              100 * (newWidth / rootRef.current.getBoundingClientRect().width);
            const perc = position === "left" ? p : 100 - p;
            childRef.current.style.width = `${perc}%`;
            updateSize(perc);
          } else {
            const top = rootRef.current.getBoundingClientRect().top;
            const newHeight = e.y - top;
            const p =
              100 *
              (newHeight / rootRef.current.getBoundingClientRect().height);
            const perc = position === "top" ? p : 100 - p;
            childRef.current.style.height = `${perc}%`;
            updateSize(perc);
          }
        }}
      >
        <div
          className="absolute"
          style={{
            zIndex: 1,
            ...(resizeClass === "resizing-ew" ?
              {
                height: "100%",
                width: "10px",
                cursor: "ew-resize",
              }
            : {
                width: "100%",
                height: "10px",
                cursor: "ns-resize",
              }),
          }}
        ></div>
      </Pan>
      {children}
    </div>
  );
};
