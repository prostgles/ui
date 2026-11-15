import { USER_TYPES } from "@common/authTypesAndConstants";
import Btn from "@components/Btn";
import { mdiViewDashboard, mdiViewDashboardEdit } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import type { WorkspaceSyncItem } from "../Dashboard/dashboardUtils";

export const WorkspaceLayoutToggle = ({
  workspace,
  variant,
}: {
  workspace: WorkspaceSyncItem;
  variant: "top-controls" | "workspace-actions";
}) => {
  const { user } = usePrgl();
  if (user?.type !== USER_TYPES.ADMIN || window.isLowWidthScreen) {
    return null;
  }

  const isFixedLayout = workspace.layout_mode === "fixed";
  return (
    <Btn
      iconPath={isFixedLayout ? mdiViewDashboardEdit : mdiViewDashboard}
      title={isFixedLayout ? "Edit layout" : "Lock Layout"}
      data-command={
        variant === "top-controls" ?
          "WorkspaceMenu.toggleWorkspaceLayoutMode"
        : undefined
      }
      aria-pressed={isFixedLayout}
      size={variant === "workspace-actions" ? "micro" : undefined}
      variant={isFixedLayout ? "filled" : "icon"}
      color={isFixedLayout ? "action" : undefined}
      onClick={(event) => {
        event.stopPropagation();
        void workspace.$update({
          layout_mode: isFixedLayout ? "editable" : "fixed",
        });
      }}
    >
      {variant === "top-controls" ?
        isFixedLayout ?
          "Edit layout"
        : "Layout"
      : undefined}
    </Btn>
  );
};
