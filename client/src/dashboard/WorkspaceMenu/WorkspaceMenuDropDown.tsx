import {
  mdiAccountMultiple,
  mdiChevronDown,
  mdiContentCopy,
  mdiViewCarousel,
} from "@mdi/js";
import React, { useMemo } from "react";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import PopupMenu from "@components/PopupMenu";
import {
  SearchList,
  type SvgIconName,
} from "@components/SearchList/SearchList";
import { SvgIcon } from "@components/SvgIcon";
import { cloneWorkspace } from "../Dashboard/cloneWorkspace";
import { WorkspaceAddBtn } from "./WorkspaceAddBtn";
import { WorkspaceDeleteBtn } from "./WorkspaceDeleteBtn";
import "./WorkspaceMenu.css";
import { WorkspaceSettings } from "./WorkspaceSettings";
import type { WorkspaceSyncItem } from "../Dashboard/dashboardUtils";
import type { Prgl } from "src/App";
import type { useSetActiveWorkspace, useWorkspaces } from "./useWorkspaces";

type P = {
  workspace: WorkspaceSyncItem;
  prgl: Prgl;
} & ReturnType<typeof useWorkspaces> &
  ReturnType<typeof useSetActiveWorkspace>;

export const WorkspaceMenuDropDown = ({
  prgl,
  workspace,
  workspaces,
  setWorkspace,
}: P) => {
  const { dbs, dbsTables, dbsMethodSchema, user } = prgl;
  const isAdmin = user?.type === "admin";
  const sortedWorkspaces = useMemo(
    () =>
      workspaces.sort(
        (a, b) =>
          new Date(a.created!).getTime() - new Date(b.created!).getTime() ||
          a.name.localeCompare(b.name),
      ),
    [workspaces],
  );
  return (
    <PopupMenu
      title="Workspaces"
      rootStyle={{
        maxHeight: `100%`,
        marginRight: "1em",
      }}
      positioning="beneath-right"
      button={
        <Btn
          title="Manage Workspaces"
          iconPath={mdiChevronDown}
          className={"text-0"}
          data-command="WorkspaceMenuDropDown"
        />
      }
      contentStyle={{
        overflow: "hidden",
        padding: 0,
        borderRadius: 0,
      }}
      render={(closePopup) => (
        <FlexCol
          className={"flex-col f-1 min-h-0 gap-0"}
          style={{ paddingTop: 0 }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              closePopup();
            }
          }}
        >
          {!workspaces.length ?
            <div className="text-2">No other workspaces</div>
          : <SearchList
              id="search-list-queries"
              data-command="WorkspaceMenu.SearchList"
              className={" b-t f-1 min-h-0 "}
              style={{ minHeight: "120px", maxHeight: "30vh" }}
              placeholder={"Workspaces"}
              items={sortedWorkspaces.map((w) => ({
                key: w.name,
                label: w.name,
                labelStyle: {},
                rowStyle: {
                  background:
                    workspace.id === w.id ? "var(--bg-li-selected)" : undefined,
                },
                styles: {
                  rowInner: {
                    alignItems: "center",
                  },
                },
                iconLeft: {
                  type: "SvgIcon",
                  pathName:
                    (w.icon as SvgIconName | undefined) || "ViewCarousel",
                  style:
                    workspace.id === w.id ?
                      { color: "var(--active)" }
                    : undefined,
                },
                contentRight: (
                  <div className="flex-row gap-p5 pl-1 show-on-parent-hover">
                    {w.published && isAdmin && (
                      <Btn
                        title="Published"
                        iconPath={mdiAccountMultiple}
                        color="action"
                        asNavLink={true}
                        size="small"
                        href={`/connection-config/${w.connection_id}?section=access_control`}
                      />
                    )}
                    <WorkspaceDeleteBtn
                      w={w}
                      dbs={dbs}
                      activeWorkspaceId={workspace.id}
                      disabledInfo={
                        isAdmin || w.isMine ?
                          undefined
                        : "You can not delete a published workspace"
                      }
                    />
                    <Btn
                      iconPath={mdiContentCopy}
                      title="Clone workspace"
                      data-command="WorkspaceMenu.CloneWorkspace"
                      size="small"
                      onClickPromise={async () => {
                        await cloneWorkspace(dbs, w.id).then((d) => {
                          setWorkspace(d.clonedWsp);
                        });
                      }}
                    />
                    {(isAdmin || w.isMine) && (
                      <>
                        <WorkspaceSettings
                          w={w}
                          dbs={prgl.dbs}
                          dbsSql={prgl.dbsSql}
                          dbsTables={dbsTables}
                          dbsMethodSchema={dbsMethodSchema}
                        />
                      </>
                    )}
                  </div>
                ),
                onPress: (e) => {
                  if (
                    w.id === workspace.id ||
                    (e.target as Element | null)?.closest(
                      ".delete-workspace",
                    ) ||
                    (e.target as Element | null)?.closest(
                      ".workspace-settings",
                    ) ||
                    (e.target as Element | null)?.closest(".clickcatchcomp")
                  )
                    return;

                  setWorkspace(w);
                  closePopup();
                },
              }))}
            />
          }
        </FlexCol>
      )}
      footer={() => (
        <WorkspaceAddBtn
          setWorkspace={setWorkspace}
          btnProps={{
            children: "New workspace",
            "data-command": "WorkspaceMenuDropDown.WorkspaceAddBtn",
          }}
        />
      )}
    />
  );
};
