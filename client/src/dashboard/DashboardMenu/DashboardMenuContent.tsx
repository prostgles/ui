import { FlexCol, FlexRowWrap } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { SearchList } from "@components/SearchList/SearchList";
import { mdiScriptTextPlay } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useRef } from "react";
import { getIsPinnedMenu } from "../Dashboard/Dashboard";
import { useAddViewToWorkspace } from "../Dashboard/useAddViewToWorkspace";
import { SchemaGraph } from "../SchemaGraph/SchemaGraph";
import { WorkspaceAddBtn } from "../WorkspaceMenu/WorkspaceAddBtn";
import { useSetActiveWorkspace } from "../WorkspaceMenu/useWorkspaces";
import { useLocalSettings } from "../localSettings";
import type { DashboardMenuProps, DashboardMenuState } from "./DashboardMenu";
import { DashboardMenuHeader } from "./DashboardMenuHeader";
import { DashboardMenuResizer } from "./DashboardMenuResizer";
import { NewTableMenu } from "./NewTableMenu";
import { SavedAgenticWorkflowsAndContainers } from "./SavedAgenticWorkflowsAndContainers";
import { ServerFunctionList } from "./ServerFunctionList";
import { TableList } from "./TableList";

type P = DashboardMenuProps & {
  onClose: undefined | VoidFunction;
  onClickSearchAll: VoidFunction;
} & Pick<DashboardMenuState, "queries">;

export const DashboardMenuContent = (props: P) => {
  const { workspace, queries, onClose, onClickSearchAll } = props;
  const { tables, theme, user, sql } = usePrgl();

  const pinnedMenu = getIsPinnedMenu(workspace);
  const isPublishedReadonlyWorkspace =
    workspace.published && workspace.user_id !== user?.id;

  const { centeredLayout } = useLocalSettings();
  const maxWidth =
    centeredLayout?.enabled ?
      (window.innerWidth - centeredLayout.maxWidth) / 2 + "px"
    : "50vw";

  const { setWorkspace } = useSetActiveWorkspace(workspace.id);

  const { addViewToWorkspace } = useAddViewToWorkspace();
  const ref = useRef<HTMLDivElement>(null);
  const bgColorClass =
    theme === "light" || !pinnedMenu ? "bg-color-0" : "bg-color-1";

  return (
    <FlexCol
      data-command="DashboardMenuContent"
      className={
        "relative f-1 min-h-0 " +
        bgColorClass +
        (window.isMobileDevice ? " p-p25 " : " p-1  ")
      }
      ref={ref}
      style={{
        ...(pinnedMenu && {
          minWidth: "200px",
          maxWidth,
          width:
            workspace.options.pinnedMenuWidth ?
              `${workspace.options.pinnedMenuWidth}px`
            : "fit-content",
          height: "100%",
        }),
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose?.();
        }
      }}
    >
      {isPublishedReadonlyWorkspace && (
        <FlexCol
          className="jc-center ai-center bg-color-1 p-1"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: 0.95,
            backdropFilter: "blur(2px)",
          }}
        >
          <div>
            This is a read-only published workspace.
            <br></br>
            Create your own workspace to open table/views.
          </div>
          <WorkspaceAddBtn
            setWorkspace={setWorkspace}
            btnProps={{
              children: "Create workspace",
              size: undefined,
            }}
          />
        </FlexCol>
      )}

      <DashboardMenuResizer
        dashboardMenuRef={ref.current}
        workspace={workspace}
      />

      {pinnedMenu && (
        <DashboardMenuHeader
          {...props}
          onClickSearchAll={onClickSearchAll}
          onClose={onClose}
        />
      )}

      {Boolean(queries.length) && (
        <SearchList
          id="search-list-queries"
          data-command="dashboard.menu.savedQueriesList"
          className={" b-t f-1 min-h-0 "}
          style={{
            ...ensureFadeDoesNotShowForOneItem,
            maxHeight: "fit-content",
          }}
          placeholder={`${queries.length} saved queries`}
          noSearchLimit={0}
          items={queries
            .sort(
              (a, b) =>
                +b.closed - +a.closed || +b.last_updated - +a.last_updated,
            )
            .map((t, i) => ({
              key: i,
              iconLeft: {
                type: "Icon",
                path: mdiScriptTextPlay,
              },
              label: t.name,
              disabledInfo: !t.closed ? "Already opened" : undefined,
              contentRight: (
                <span className="text-2 ml-auto italic">
                  {t.sql.trim().slice(0, 10)}...
                </span>
              ),
              onPress: () => {
                void t.$update({ closed: false, workspace_id: workspace.id });
                onClose?.();
              },
            }))}
        />
      )}

      <TableList
        pinnedMenu={pinnedMenu}
        workspace={workspace}
        onClose={onClose}
      />

      <ServerFunctionList
        onPressFunction={(functionName) => {
          void addViewToWorkspace({
            workspace_id: workspace.id,
            type: "method",
            method_name: functionName,
          });
          onClose?.();
        }}
      />

      <SavedAgenticWorkflowsAndContainers />
      <FlexRowWrap className="f-0 mt-1 mx-p5 jc-between">
        {!tables.length && !sql && (
          <InfoRow>
            You have not been granted any permissions. <br></br> Check with
            system administrator
          </InfoRow>
        )}

        <NewTableMenu {...props} onClose={onClose} />

        <SchemaGraph />
      </FlexRowWrap>
    </FlexCol>
  );
};

export const ensureFadeDoesNotShowForOneItem = { minHeight: "120px" } as const;
