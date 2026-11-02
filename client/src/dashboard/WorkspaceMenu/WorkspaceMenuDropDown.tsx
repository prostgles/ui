import Btn from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
import { SvgIcon } from "@components/SvgIcon";
import { mdiChevronDown } from "@mdi/js";
import React from "react";
import { canCreateWorkspace } from "../Dashboard/cloneWorkspace";
import { WorkspaceAddBtn } from "./WorkspaceAddBtn";
import {
  WorkspaceMenuList,
  type WorkspaceMenuContentProps,
} from "./WorkspaceMenuList";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

export const WorkspaceMenuDropDown = (props: WorkspaceMenuContentProps) => {
  const { workspace, setWorkspace } = props;
  const { dbs } = usePrgl();
  const canCreateWorkspaces = canCreateWorkspace(dbs);

  return (
    <PopupMenu
      className="f-1 min-w-0"
      rootStyle={{
        maxHeight: `100%`,
        marginRight: "1em",
      }}
      positioning="beneath-left"
      button={
        <Btn
          title="Manage Workspaces"
          iconPath={mdiChevronDown}
          iconPosition="right"
          className="text-0 max-w-full"
          size="default"
          data-command="WorkspaceMenuDropDown"
          data-workspace-id={workspace.id}
          children={
            <>
              {workspace.icon && <SvgIcon icon={workspace.icon} size={22} />}
              <span className="text-ellipsis">{workspace.name}</span>
            </>
          }
          style={{ fontSize: "18px" }}
        />
      }
      contentStyle={{
        overflow: "hidden",
        padding: 0,
        borderRadius: 0,
      }}
      render={(onClose) => (
        <WorkspaceMenuList
          {...props}
          onClose={onClose}
          roundedItems={false}
        />
      )}
      footerStyle={{ padding: ".5em" }}
      footer={
        canCreateWorkspaces ?
          (closeMenu: VoidFunction) => (
            <WorkspaceAddBtn
              setWorkspace={(workspace) => {
                setWorkspace(workspace);
                closeMenu();
              }}
              btnProps={{
                children: "New workspace",
                "data-command": "WorkspaceMenuDropDown.WorkspaceAddBtn",
              }}
            />
          )
        : undefined
      }
    />
  );
};
