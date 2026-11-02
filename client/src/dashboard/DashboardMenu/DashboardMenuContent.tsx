import { USER_TYPES } from "@common/authTypesAndConstants";
import Btn from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { SearchList } from "@components/SearchList/SearchList";
import { mdiPlus, mdiScriptTextPlay } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useRef } from "react";
import { getIsPinnedMenu } from "../Dashboard/Dashboard";
import { useAddViewToWorkspace } from "../Dashboard/useAddViewToWorkspace";
import { SchemaGraph } from "../SchemaGraph/SchemaGraph";
import { canCreateWorkspace } from "../Dashboard/cloneWorkspace";
import { WorkspaceAddBtn } from "../WorkspaceMenu/WorkspaceAddBtn";
import { WorkspaceMenu } from "../WorkspaceMenu/WorkspaceMenu";
import { useSetActiveWorkspace } from "../WorkspaceMenu/useWorkspaces";
import { useLocalSettings } from "../localSettings";
import type { DashboardMenuProps, DashboardMenuState } from "./DashboardMenu";
import { DashboardMenuFooter } from "./DashboardMenuFooter";
import { DashboardMenuResizer } from "./DashboardMenuResizer";
import { DashboardMenuSection } from "./DashboardMenuSection";
import { NewTableMenu } from "./NewTableMenu";
import { SavedAgenticWorkflowsAndContainers } from "./SavedAgenticWorkflowsAndContainers";
import { ServerFunctionList } from "./ServerFunctionList";
import { TableList } from "./TableList";
import { DashboardMenuSettings } from "./DashboardMenuSettings";

type P = DashboardMenuProps & {
  onClose: undefined | VoidFunction;
} & Pick<DashboardMenuState, "queries">;

export const DashboardMenuContent = (props: P) => {
  const { workspace, queries, onClose } = props;
  const { tables, theme, user, sql, dbs } = usePrgl();

  const pinnedMenu = getIsPinnedMenu(user);
  const isPublishedReadonlyWorkspace =
    user?.type !== USER_TYPES.ADMIN &&
    workspace.published &&
    workspace.user_id !== user?.id;
  const canCreateWorkspaces = canCreateWorkspace(dbs);
  const canOpenViews = canCreateWorkspaces && !isPublishedReadonlyWorkspace;

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
      className={"relative f-1 min-h-0 o-hidden gap-0 " + bgColorClass}
      ref={ref}
      style={{
        ...(pinnedMenu && {
          minWidth: "200px",
          maxWidth,
          width:
            user?.options?.pinnedMenuWidth ?
              `${user.options.pinnedMenuWidth}px`
            : "400px",
          height: "100%",
        }),
      }}
    >
      <FlexCol
        className={
          "f-1 min-h-0 o-auto " + (window.isMobileDevice ? "p-p25" : "p-p5")
        }
      >
        <WorkspaceMenu
          workspace={workspace}
          variant="list"
          onClose={onClose}
          titleRightContent={
            canOpenViews && (
              <FlexRowWrap className="DashboardMenuHeader gap-p5 f-0">
                <DashboardMenuSettings workspace={workspace} />
              </FlexRowWrap>
            )
          }
        />
        {isPublishedReadonlyWorkspace && canCreateWorkspaces && (
          <FlexCol className="jc-center ai-center bg-color-1 p-1">
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

        {canOpenViews && (
          <>
            <DashboardMenuSection
              title="Tables/views"
              itemCount={tables.length}
              addButton={
                <>
                  <SchemaGraph />
                  <NewTableMenu {...props} onClose={onClose} />
                </>
              }
            >
              <TableList
                pinnedMenu={pinnedMenu}
                workspace={workspace}
                onClose={onClose}
              />
            </DashboardMenuSection>

            <DashboardMenuSection
              title="Saved queries"
              itemCount={queries.length}
              addButton={
                <Btn
                  title="Add SQL query"
                  data-command="dashboard.menu.sqlEditor"
                  iconPath={mdiPlus}
                  size="small"
                  color="action"
                  disabledInfo={sql ? undefined : "Not permitted"}
                  onClickPromise={async () => {
                    await addViewToWorkspace({
                      workspace_id: workspace.id,
                      type: "sql",
                      name: "SQL Query",
                    });
                    onClose?.();
                  }}
                />
              }
            >
              {Boolean(queries.length) && (
                <SearchList
                  id="search-list-queries"
                  data-command="dashboard.menu.savedQueriesList"
                  className={" f-1 min-h-0 "}
                  style={{
                    ...ensureFadeDoesNotShowForOneItem,
                    maxHeight: "fit-content",
                  }}
                  placeholder={`${queries.length} saved queries`}
                  noSearchLimit={0}
                  items={queries
                    .sort(
                      (a, b) =>
                        +b.closed - +a.closed ||
                        +b.last_updated - +a.last_updated,
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
                        void t.$update({
                          closed: false,
                          workspace_id: workspace.id,
                        });
                        onClose?.();
                      },
                    }))}
                />
              )}
            </DashboardMenuSection>

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
            {!tables.length && !sql && (
              <FlexRowWrap className="f-0 mt-1 mx-p5 jc-between">
                <InfoRow>
                  You have not been granted any permissions. <br></br> Check
                  with system administrator
                </InfoRow>
              </FlexRowWrap>
            )}
          </>
        )}
      </FlexCol>
      {pinnedMenu && <DashboardMenuResizer dashboardMenuRef={ref.current} />}
      <DashboardMenuFooter onClose={onClose} />
    </FlexCol>
  );
};

export const ensureFadeDoesNotShowForOneItem = { minHeight: "120px" } as const;
