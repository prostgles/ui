import Btn from "@components/Btn";
import { FlexRow, classOverride } from "@components/Flex";
import { SvgIcon } from "@components/SvgIcon";
import { onWheelScroll } from "@components/Table/Table";
import { mdiPencil, mdiViewDashboard, mdiViewDashboardEdit } from "@mdi/js";
import React, { useEffect, useRef } from "react";
import type { Prgl } from "../../App";
import type { Command } from "../../Testing";
import type { WorkspaceSyncItem } from "../Dashboard/dashboardUtils";
import { useSetActiveWorkspace, useWorkspaces } from "./useWorkspaces";
import "./WorkspaceMenu.css";
import { WorkspaceMenuDropDown } from "./WorkspaceMenuDropDown";

type P = {
  workspace: WorkspaceSyncItem;
  prgl: Prgl;
  className?: string;
};

export const WorkspaceMenu = (props: P) => {
  const {
    workspace,
    className,
    prgl: { dbs, user },
  } = props;
  const listRef = useRef<HTMLDivElement>(null);

  const { setWorkspace } = useSetActiveWorkspace(workspace.id);
  const userId = user?.id;
  const { workspaces } = useWorkspaces(dbs, userId!, workspace.connection_id);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.querySelector("li.active")?.scrollIntoView();
    }, 100);
  }, [workspace.id, workspaces]);

  const renderedWorkspaces =
    window.isLowWidthScreen ?
      workspaces.filter((w) => w.id === workspace.id)
    : workspaces;

  return (
    <FlexRow
      ref={listRef}
      className={classOverride(
        "WorkspaceMenu as-end jc-center text-white ai-center f-1  min-w-0 o-auto h-fit",
        className,
      )}
      style={{
        gap: "1px",
      }}
    >
      <ul
        className={
          "no-decor o-auto f-1 min-w-0 max-w-fit flex-row no-scroll-bar ai-end"
        }
        onWheel={onWheelScroll()}
        data-command={"WorkspaceMenu.list" satisfies Command}
      >
        {renderedWorkspaces.map((w) => (
          <li
            key={w.id}
            className={
              "workspace-list-item text-1 relative flex-row " +
              (workspace.id === w.id ? "active" : "")
            }
          >
            <Btn
              title={
                (w.published && !w.isMine ? "Shared workspace" : "Workspace") +
                (w.isMine ? "" : " (readonly)")
              }
              iconNode={w.icon ? <SvgIcon icon={w.icon} /> : undefined}
              style={{
                padding: "16px",
                borderBottomStyle: "solid",
                borderBottomWidth: "4px",
                borderBottomColor: "transparent",
                ...(workspace.id === w.id && {
                  borderBottomColor: "var(--active)",
                  fontWeight: 600,
                }),
                borderRadius: 0,
                whiteSpace: "nowrap",
              }}
              onClick={() => {
                setWorkspace(w);
              }}
            >
              {w.name}
            </Btn>
          </li>
        ))}
      </ul>

      {user?.type === "admin" && (
        <Btn
          iconPath={
            workspace.layout_mode === "fixed" ?
              mdiViewDashboardEdit
            : mdiViewDashboard
          }
          title={"Toggle Layout Mode"}
          // variant="faded"
          // color={"action"}
          data-command="WorkspaceMenu.toggleWorkspaceLayoutMode"
          // color={workspace.layout_mode !== "fixed" ? "action" : undefined}
          // size="small"
          onClick={() => {
            workspace.$update({
              layout_mode:
                workspace.layout_mode === "fixed" ? "editable" : "fixed",
            });
          }}
        >
          {/* {workspace.layout_mode === "fixed" ? "Edit" : "Preview"} */}
        </Btn>
      )}
      <WorkspaceMenuDropDown
        {...props}
        setWorkspace={setWorkspace}
        workspaces={workspaces}
      />
    </FlexRow>
  );
};
