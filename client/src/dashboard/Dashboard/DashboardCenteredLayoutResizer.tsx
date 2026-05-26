import { Pan } from "@components/Pan";
import React from "react";
import { useDebouncedCallback } from "src/hooks/useDebouncedCallback";
import { useLocalSettings } from "../localSettings";
import { CENTERED_WIDTH_CSS_VAR } from "./Dashboard";

export const DashboardCenteredLayoutResizer = () => {
  const localSettings = useLocalSettings();

  const updateCenteredLayoutWidth = useDebouncedCallback(
    (newWidth: number) => {
      localSettings.$set({
        centeredLayout: {
          enabled: localSettings.centeredLayout?.enabled ?? false,
          maxWidth: newWidth,
        },
      });
    },
    [localSettings],
    200,
  );

  if (!localSettings.centeredLayout?.enabled) {
    return null;
  }
  return (
    <Pan
      key={"wsp-centered-resize"}
      data-command="dashboard.centered-layout.resize"
      style={{
        height: "100%",
        width: "25px",
        cursor: "ew-resize",
      }}
      onPress={(e, node) => {
        node.classList.toggle("resizing-ew", true);
      }}
      onRelease={(e, node) => {
        node.classList.toggle("resizing-ew", false);
      }}
      onPan={(e) => {
        const dashboardNode = e.node.closest<HTMLDivElement>(".Dashboard");
        const dashboardContent =
          dashboardNode?.querySelector<HTMLDivElement>(".ViewRenderer");
        if (dashboardNode && dashboardContent) {
          const newCenteredWidth = Math.max(200, window.innerWidth - 2 * e.x);
          dashboardNode.style.setProperty(
            CENTERED_WIDTH_CSS_VAR,
            `${newCenteredWidth}px`,
          );
          updateCenteredLayoutWidth(newCenteredWidth);
        }
      }}
    />
  );
};
