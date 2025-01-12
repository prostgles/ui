import {
  mdiAccountMultiple,
  mdiChevronDown,
  mdiContentCopy,
  mdiViewCarousel,
} from "@mdi/js";
import React, { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow, classOverride } from "../../components/Flex";
import { Icon } from "../../components/Icon/Icon";
import PopupMenu from "../../components/PopupMenu";
import SearchList from "../../components/SearchList/SearchList";
import { SvgIcon } from "../../components/SvgIcon";
import { onWheelScroll } from "../../components/Table/Table";
import type { Workspace, WorkspaceSyncItem } from "../Dashboard/dashboardUtils";
import { WorkspaceAddBtn } from "./WorkspaceAddBtn";
import { WorkspaceDeleteBtn } from "./WorkspaceDeleteBtn";
import "./WorkspaceMenu.css";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { cloneWorkspace } from "../Dashboard/cloneWorkspace";
import { API_PATH_SUFFIXES } from "../../../../commonTypes/utils";

type P = {
  workspace: WorkspaceSyncItem;
  prgl: Prgl;
  className?: string;
};

export const getWorkspacePath = (
  w: Pick<Workspace, "id" | "connection_id">,
) => {
  return [API_PATH_SUFFIXES.DASHBOARD, `${w.connection_id}?workspaceId=${w.id}`]
    .filter((v) => v)
    .join("/");
};

export const useSetNewWorkspace = (currentWorkspaceId: string | undefined) => {
  const navigate = useNavigate();
  const setWorkspace = useCallback(
    (w: Pick<Workspace, "id" | "connection_id">) => {
      if (w.id === currentWorkspaceId) {
        return;
      }
      const path = getWorkspacePath(w);

      navigate(path);
    },
    [currentWorkspaceId, navigate],
  );

  return { setWorkspace };
};

export const WorkspaceMenu = (props: P) => {
  const {
    workspace,
    className,
    prgl: { dbs, dbsTables, dbsMethods, user },
  } = props;
  const listRef = useRef<HTMLDivElement>(null);

  const { data: unsortedWorkspaces = [] } = dbs.workspaces.useSync!(
    { connection_id: workspace.connection_id, deleted: false },
    { handlesOnData: true, select: "*", patchText: false },
  );
  const { setWorkspace } = useSetNewWorkspace(workspace.id);
  const userId = user?.id;
  const isAdmin = user?.type === "admin";
  const workspaces = useMemo(() => {
    setTimeout(() => {
      listRef.current?.querySelector("li.active")?.scrollIntoView();
    }, 100);
    return (
      unsortedWorkspaces
        .slice(0)
        .sort((a, b) => +new Date(a.created!) - +new Date(b.created!))
        .map((wsp) => ({
          ...wsp,
          isMine: wsp.user_id === userId,
        }))
        /** Exclude editable original workspaces */
        .filter(
          (wsp) => wsp.isMine || !wsp.published || wsp.publish_mode === "fixed",
        )
    );
  }, [unsortedWorkspaces, userId]);

  const WorkspaceMenuDropDown = (
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
          style={{
            padding: "12px",
          }}
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
              items={workspaces
                .sort((a, b) => +b.last_updated! - +a.last_updated!)
                .map((w) => ({
                  key: w.name,
                  label: w.name,
                  labelStyle: {},
                  rowStyle:
                    workspace.id === w.id ?
                      {
                        background: "var(--bg-li-selected)",
                      }
                    : {},
                  contentLeft: (
                    <div
                      className="flex-col ai-start f-0 mr-1 text-2"
                      style={
                        workspace.id === w.id ?
                          { color: "var(--active)" }
                        : undefined
                      }
                    >
                      {w.icon ?
                        <SvgIcon icon={w.icon} />
                      : <Icon path={mdiViewCarousel} size={1} />}
                    </div>
                  ),
                  contentRight: (
                    <div className="flex-row gap-p5 pl-1 show-on-parent-hover">
                      {w.published && isAdmin && (
                        <Btn
                          title="Published"
                          iconPath={mdiAccountMultiple}
                          color="action"
                          asNavLink={true}
                          href={`/connection-config/${w.connection_id}?section=access_control`}
                        />
                      )}
                      <WorkspaceDeleteBtn
                        w={w}
                        dbs={props.prgl.dbs}
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
                            theme={props.prgl.theme}
                            dbs={props.prgl.dbs}
                            dbsTables={dbsTables}
                            dbsMethods={dbsMethods}
                          />
                        </>
                      )}
                    </div>
                  ),
                  onPress: (e) => {
                    if (
                      w.id === props.workspace.id ||
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
          dbs={props.prgl.dbs}
          connection_id={workspace.connection_id}
          setWorkspace={setWorkspace}
          btnProps={{
            children: "New workspace",
            "data-command": "WorkspaceMenuDropDown.WorkspaceAddBtn",
          }}
        />
      )}
    />
  );

  const renderedWorkspaces =
    window.isLowWidthScreen ?
      workspaces.filter((w) => w.id === workspace.id)
    : workspaces;
  return (
    <FlexRow
      ref={listRef}
      className={classOverride(
        "WorkspaceMenu as-end jc-center text-white ai-end f-1  min-w-0 o-auto h-fit",
        className,
      )}
      style={{
        gap: "1px",
      }}
    >
      <ul
        className={"o-auto f-1 min-w-0 max-w-fit flex-row no-scroll-bar ai-end"}
        onWheel={onWheelScroll()}
      >
        {renderedWorkspaces.map((w) => (
          <li
            key={w.id}
            className={
              "workspace-list-item text-1 relative " +
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
      {WorkspaceMenuDropDown}
    </FlexRow>
  );
};
