import React, { useRef } from "react";
import type { DashboardMenuProps } from "./DashboardMenu";
import { Pan } from "../../components/Table/Table";
import { useLocalSettings } from "../localSettings";

type P = {
  dashboardMenuRef: HTMLDivElement | null;
} & Pick<DashboardMenuProps, "workspace">;

export const DashboardMenuResizer = ({ dashboardMenuRef, workspace }: P) => {
  const localSettings = useLocalSettings();

  const dragging = useRef<{
    startClientX: number;
    clientX: number;
    startWidth: number;
  }>();

  if (!dashboardMenuRef) return null;

  return (
    <Pan
      key={"wsp"}
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "25px",
        cursor: "ew-resize",
      }}
      onPress={(e, node) => {
        node.classList.toggle("resizing-ew", true);
      }}
      onRelease={(e, node) => {
        node.classList.toggle("resizing-ew", false);
      }}
      onPanStart={(e) => {
        if (!dashboardMenuRef.isConnected) return;
        dragging.current = {
          startClientX: e.x,
          clientX: e.x,
          startWidth: dashboardMenuRef.clientWidth,
        };
      }}
      onPan={(e) => {
        if (!dashboardMenuRef.isConnected || !dragging.current) {
          return false;
        }
        const deltaX = e.x - dragging.current.startClientX;
        const newWidth = dragging.current.startWidth + deltaX;
        const newWidthStr = `${newWidth}px`;
        if (localSettings.centeredLayout?.enabled) {
          dashboardMenuRef.style.maxWidth = newWidthStr;
        }
        dashboardMenuRef.style.width = newWidthStr;
      }}
      onPanEnd={(e) => {
        dragging.current = undefined;
        workspace.$update(
          { options: { pinnedMenuWidth: dashboardMenuRef.clientWidth } },
          { deepMerge: true },
        );
      }}
    />
  );
};
