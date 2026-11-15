import { USER_TYPES } from "@common/authTypesAndConstants";
import { getConnectionPaths } from "@common/utils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import {
  SearchList,
  type SearchListProps,
  type SvgIconName,
} from "@components/SearchList/SearchList";
import { mdiAccountMultiple, mdiContentCopy, mdiDotsVertical } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo } from "react";
import {
  cloneWorkspace,
  canCreateWorkspace,
} from "../Dashboard/cloneWorkspace";
import type { WorkspaceSyncItem } from "../Dashboard/dashboardUtils";
import type { useSetActiveWorkspace, useWorkspaces } from "./useWorkspaces";
import { WorkspaceDeleteBtn } from "./WorkspaceDeleteBtn";
import { WorkspaceLayoutToggle } from "./WorkspaceLayoutToggle";
import "./WorkspaceMenu.css";
import { WorkspaceSettings } from "./WorkspaceSettings";

export type WorkspaceMenuContentProps = {
  workspace: WorkspaceSyncItem;
  onClose: VoidFunction | undefined;
  showSearch: boolean;
} & Pick<SearchListProps, "roundedItems"> &
  ReturnType<typeof useWorkspaces> &
  ReturnType<typeof useSetActiveWorkspace>;

export const WorkspaceMenuList = ({
  workspace,
  workspaces,
  setWorkspace,
  onClose,
  showSearch,
  roundedItems,
}: WorkspaceMenuContentProps) => {
  const { dbs, user } = usePrgl();
  const isAdmin = user?.type === USER_TYPES.ADMIN;
  const canCreateWorkspaces = canCreateWorkspace(dbs);
  const sortedWorkspaces = useMemo(
    () =>
      workspaces.sort(
        (a, b) =>
          Number(b.published) - Number(a.published) ||
          new Date(a.created!).getTime() - new Date(b.created!).getTime() ||
          a.name.localeCompare(b.name),
      ),
    [workspaces],
  );
  return (
    <FlexCol
      data-command="WorkspaceMenu.list"
      className={"flex-col f-1 min-h-0 gap-0"}
      style={{ paddingTop: 0 }}
    >
      <SearchList
        key={showSearch ? "search" : "list"}
        id="search-list-workspaces"
        roundedItems={roundedItems}
        data-command="WorkspaceMenu.SearchList"
        className={" f-1 min-h-0 "}
        style={{ minHeight: "120px", maxHeight: "50vh" }}
        searchStyle={{ margin: "0.5em" }}
        noSearchLimit={showSearch ? 0 : Infinity}
        limit={Infinity}
        autoFocus={showSearch}
        placeholder={"Workspaces"}
        noResultsContent={<div className="text-2">No workspaces</div>}
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
            pathName: (w.icon as SvgIconName | undefined) || "ViewCarousel",
            style:
              workspace.id === w.id ? { color: "var(--active)" } : undefined,
          },
          // parentLabels: w.published ? [] : ["Saved workspaces"],
          contentRight: (
            <div
              className={`WorkspaceActions flex-row gap-p5 pl-1 ${workspace.id === w.id ? "" : "show-on-parent-hover"}`}
              onClick={(event) => event.stopPropagation()}
              onKeyUp={(event) => event.stopPropagation()}
            >
              <WorkspaceLayoutToggle
                workspace={w}
                variant="workspace-actions"
              />
              {w.published && isAdmin && (
                <Btn
                  title="Published"
                  iconPath={mdiAccountMultiple}
                  color="action"
                  asNavLink={true}
                  size="micro"
                  variant="icon"
                  href={`${getConnectionPaths({ id: w.connection_id }).config}?section=access_control`}
                />
              )}
              <PopupMenu
                positioning="beneath-right"
                contentStyle={{ padding: 0 }}
                button={
                  <Btn
                    title="Workspace actions"
                    iconPath={mdiDotsVertical}
                    size="micro"
                    variant="icon"
                  />
                }
                render={(closeActions) => (
                  <FlexCol className="WorkspaceActionsMenu gap-0">
                    <WorkspaceDeleteBtn
                      workspace={w}
                      dbs={dbs}
                      activeWorkspaceId={workspace.id}
                      disabledInfo={
                        isAdmin || w.isMine ?
                          undefined
                        : "You can not delete a published workspace"
                      }
                    />
                    {canCreateWorkspaces && (
                      <Btn
                        iconPath={mdiContentCopy}
                        title="Clone workspace"
                        titleAsLabel={true}
                        className="w-full jc-start"
                        data-command="WorkspaceMenu.CloneWorkspace"
                        size="small"
                        onClickPromise={async () => {
                          const { clonedWsp } = await cloneWorkspace(dbs, w.id);
                          setWorkspace(clonedWsp);
                          closeActions();
                          onClose?.();
                        }}
                      />
                    )}
                    {(isAdmin || w.isMine) && <WorkspaceSettings w={w} />}
                  </FlexCol>
                )}
              />
            </div>
          ),
          onPress: () => {
            setWorkspace(w);
            onClose?.();
          },
        }))}
      />
    </FlexCol>
  );
};
