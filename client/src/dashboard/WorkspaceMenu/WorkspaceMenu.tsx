import { USER_TYPES } from "@common/authTypesAndConstants";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { mdiMagnify } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";
import { canCreateWorkspace } from "../Dashboard/cloneWorkspace";
import type { WorkspaceSyncItem } from "../Dashboard/dashboardUtils";
import { useSetActiveWorkspace, useWorkspaces } from "./useWorkspaces";
import { WorkspaceAddBtn } from "./WorkspaceAddBtn";
import "./WorkspaceMenu.css";
import { WorkspaceMenuList } from "./WorkspaceMenuList";
import { WorkspaceMenuDropDown } from "./WorkspaceMenuDropDown";

type P = {
  workspace: WorkspaceSyncItem;
  variant: "list" | "select";
  onClose: VoidFunction | undefined;
  titleRightContent?: React.ReactNode;
};

export const WorkspaceMenu = (props: P) => {
  const { workspace, variant, onClose, titleRightContent } = props;
  const { setWorkspace } = useSetActiveWorkspace(workspace.id);
  const [showSearch, setShowSearch] = useState(false);
  const { dbs, user } = usePrgl();
  const userId = user?.id;
  const isAdmin = user?.type === USER_TYPES.ADMIN;
  const { workspaces } = useWorkspaces(
    dbs,
    userId!,
    workspace.connection_id,
    isAdmin,
  );

  const canSearch = workspaces.length >= 5;
  const menuProps = {
    ...props,
    setWorkspace,
    workspaces,
    onClose,
    showSearch: canSearch && (variant === "select" || showSearch),
  };
  if (variant === "select") {
    return <WorkspaceMenuDropDown {...menuProps} />;
  }
  return (
    <FlexCol className="WorkspaceMenu min-h-0 gap-p5 f-0">
      <FlexRow className="gap-p5">
        <span className="font-14 ta-start text-1p5 f-1 p-p5 bold">
          Workspaces
        </span>
        {titleRightContent}
        {canSearch && (
          <Btn
            title="Search workspaces"
            iconPath={mdiMagnify}
            variant="icon"
            color={showSearch ? "action" : undefined}
            aria-expanded={showSearch}
            aria-controls={showSearch ? "search-list-workspaces" : undefined}
            onClick={() => setShowSearch(!showSearch)}
          />
        )}
        {canCreateWorkspace(dbs) && (
          <WorkspaceAddBtn
            setWorkspace={(workspace) => {
              setWorkspace(workspace);
              onClose?.();
            }}
            btnProps={{
              variant: "text",
              "data-command": "WorkspaceMenuDropDown.WorkspaceAddBtn",
            }}
          />
        )}
      </FlexRow>
      <WorkspaceMenuList {...menuProps} />
    </FlexCol>
  );
};
