import { FlexCol } from "@components/Flex";
import { Pan } from "@components/Pan";
import React from "react";
import type { WindowSyncItem } from "./Dashboard/dashboardUtils";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";

export type ChildWindowLayoutProps = {
  childWindow: { node: React.ReactNode; w: WindowSyncItem } | undefined;
  children: React.ReactNode;
};

export const ChildWindowLayout = ({
  children,
  childWindow,
}: ChildWindowLayoutProps) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const childRef = React.useRef<HTMLDivElement>(null);

  const childWindowPosition =
    childWindow?.w.parent_window_options?.position ?? "bottom";

  const resizeClass =
    childWindowPosition === "top" || childWindowPosition === "bottom" ?
      "resizing-ns"
    : "resizing-ew";
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
            sizePercentage: newPerc,
          },
        },
        { deepMerge: true },
      );
    },
    [childWindow?.w],
    1000,
  );

  if (!childWindow) return <>{children}</>;
  return (
    <div
      ref={rootRef}
      style={{
        display: "flex",
        flex: 1,
        flexDirection:
          childWindowPosition === "top" ? "column"
          : childWindowPosition === "bottom" ? "column-reverse"
          : childWindowPosition === "left" ? "row"
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
          }[childWindowPosition]
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
            const perc =
              100 -
              100 * (newWidth / rootRef.current.getBoundingClientRect().width);
            childRef.current.style.width = `${perc}%`;
            updateSize(perc);
          } else {
            const top = rootRef.current.getBoundingClientRect().top;
            const newHeight = e.y - top;
            const perc =
              100 -
              100 *
                (newHeight / rootRef.current.getBoundingClientRect().height);
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
                width: "25px",
                cursor: "ew-resize",
              }
            : {
                width: "100%",
                height: "25px",
                cursor: "ns-resize",
              }),
          }}
        ></div>
      </Pan>
      {children}
    </div>
  );
};
