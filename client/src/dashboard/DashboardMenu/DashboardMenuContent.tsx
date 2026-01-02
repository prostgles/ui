import {
  mdiFile,
  mdiFilter,
  mdiFunction,
  mdiRefresh,
  mdiScriptTextPlay,
  mdiTable,
  mdiTableEdit,
  mdiTableEye,
} from "@mdi/js";
import type { MethodFullDef } from "prostgles-types";
import { isObject } from "prostgles-types";
import React, { useRef } from "react";
import { dataCommand } from "../../Testing";
import Btn from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { InfoRow } from "@components/InfoRow";
import { SearchList } from "@components/SearchList/SearchList";
import { SvgIcon } from "@components/SvgIcon";
import { t } from "../../i18n/i18nUtils";
import { SchemaFilter } from "../../pages/NewConnection/SchemaFilter";
import { getIsPinnedMenu } from "../Dashboard/Dashboard";
import { SchemaGraph } from "../SchemaGraph/SchemaGraph";
import { WorkspaceAddBtn } from "../WorkspaceMenu/WorkspaceAddBtn";
import { useSetActiveWorkspace } from "../WorkspaceMenu/useWorkspaces";
import { useLocalSettings } from "../localSettings";
import type { DashboardMenuProps, DashboardMenuState } from "./DashboardMenu";
import { DashboardMenuHeader } from "./DashboardMenuHeader";
import { DashboardMenuResizer } from "./DashboardMenuResizer";
import { NewTableMenu } from "./NewTableMenu";
import type { TablesWithInfo } from "./useTableSizeInfo";

type P = DashboardMenuProps & {
  onClose: undefined | VoidFunction;
  onClickSearchAll: VoidFunction;
  tablesWithInfo: TablesWithInfo;
} & Pick<DashboardMenuState, "queries">;

export const DashboardMenuContent = (props: P) => {
  const {
    tables,
    loadTable,
    workspace,
    prgl,
    queries,
    onClose,
    onClickSearchAll,
    tablesWithInfo,
  } = props;
  const {
    db,
    methods,
    theme,
    user,
    dbsMethods: { reloadSchema },
    dbs,
  } = prgl;

  const pinnedMenu = getIsPinnedMenu(workspace);
  const isPublishedReadonlyWorkspace =
    workspace.published && workspace.user_id !== user?.id;

  const { centeredLayout } = useLocalSettings();
  const maxWidth =
    centeredLayout?.enabled ?
      (window.innerWidth - centeredLayout.maxWidth) / 2 + "px"
    : "50vw";

  const detailedMethods: (MethodFullDef & { name: string })[] = Object.keys(
    methods,
  )
    .filter((n) => {
      const m = methods[n];
      return m && typeof m !== "function" && isObject(m) && m.run;
    })
    .map((methodName) => ({
      name: methodName,
      ...(methods[methodName] as MethodFullDef),
    }));

  const { setWorkspace } = useSetActiveWorkspace(workspace.id);

  const ref = useRef<HTMLDivElement>(null);
  const ensureFadeDoesNotShowForOneItem = { minHeight: "120px" } as const;
  const bgColorClass =
    theme === "light" || !pinnedMenu ? "bg-color-0" : "bg-color-1";

  return (
    <FlexCol
      className={
        "DashboardMenuContent relative f-1 min-h-0 " +
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
            connection_id={workspace.connection_id}
            dbs={prgl.dbs}
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
              contentLeft: (
                <div className="flex-col ai-start f-0 text-1">
                  <Icon path={mdiScriptTextPlay} size={1} />
                </div>
              ),
              label: t.name,
              disabledInfo: !t.closed ? "Already opened" : undefined,
              contentRight: (
                <span className="text-2 ml-auto italic">
                  {t.sql.trim().slice(0, 10)}...
                </span>
              ),
              onPress: () => {
                t.$update?.({ closed: false, workspace_id: workspace.id });
                onClose?.();
              },
            }))}
        />
      )}

      {!tables.length ?
        <div className="text-1p5 p-1">0 tables/views</div>
      : <SearchList
          className={"search-list-tables min-h-0  f-1"}
          data-command="dashboard.menu.tablesSearchList"
          limit={100}
          style={ensureFadeDoesNotShowForOneItem}
          noSearchLimit={0}
          leftContent={
            <SchemaFilter
              asSelect={{
                btnProps: {
                  children: "",
                  title: t.NewConnectionForm["Schemas"],
                  iconPath: mdiFilter,
                  variant: "icon",
                },
                label: "",
              }}
              db={db}
              db_schema_filter={props.prgl.connection.db_schema_filter}
              onChange={(newDbSchemaFilter) => {
                void dbs.connections.update(
                  {
                    id: prgl.connectionId,
                  },
                  {
                    db_schema_filter: newDbSchemaFilter,
                  },
                );
              }}
            />
          }
          inputProps={{
            "data-command": "dashboard.menu.tablesSearchListInput",
          }}
          placeholder={`${tables.length} tables/views`}
          noResultsContent={
            <FlexCol>
              <InfoRow color="info" variant="filled">
                Table/view not found.
              </InfoRow>
              <Btn
                variant="faded"
                color="action"
                disabledInfo={!reloadSchema ? "Must be admin" : ""}
                onClickPromise={async () => {
                  await reloadSchema!(props.prgl.connectionId);
                }}
                iconPath={mdiRefresh}
              >
                Refresh schema
              </Btn>
            </FlexCol>
          }
          items={tablesWithInfo.map((t, i) => {
            return {
              contentLeft: (
                <div
                  className="flex-col ai-start f-0 text-1"
                  {...(t.info.isFileTable ?
                    dataCommand("dashboard.menu.fileTable")
                  : {})}
                >
                  {t.icon ?
                    <SvgIcon icon={t.icon} />
                  : <Icon
                      title={
                        t.info.isFileTable ? "File table"
                        : t.info.isView ?
                          "View"
                        : "Table"
                      }
                      path={
                        t.info.isFileTable ? mdiFile
                        : db[t.name]?.insert ?
                          mdiTableEdit
                        : mdiTableEye
                      }
                      size={1}
                    />
                  }
                </div>
              ),
              key: t.name,
              label: t.label,
              title: t.info.comment,
              contentRight: t.endText.length > 0 && (
                <span title={t.endTitle} className="text-2 ml-auto">
                  {t.endText}
                </span>
              ),
              onPress: () => {
                loadTable({ type: "table", table: t.name, name: t.label });
                onClose?.();
              },
            };
          })}
        />
      }
      {detailedMethods.length > 0 && (
        <SearchList
          limit={100}
          noSearchLimit={0}
          data-command="dashboard.menu.serverSideFunctionsList"
          className={"search-list-functions b-t f-1 min-h-0 max-h-fit "}
          style={ensureFadeDoesNotShowForOneItem}
          placeholder={"Search " + detailedMethods.length + " functions"}
          items={detailedMethods.map((t, i) => ({
            contentLeft: (
              <div className="flex-col ai-start f-0 text-1">
                <Icon path={mdiFunction} />
              </div>
            ),
            key: t.name,
            label: t.name,
            onPress: () => {
              void loadTable({ type: "method", method_name: t.name });
              onClose?.();
            },
          }))}
        />
      )}
      <FlexRowWrap className="f-0 mt-1 mx-p5 jc-between">
        {!tables.length && !db.sql && (
          <InfoRow>
            You have not been granted any permissions. <br></br> Check with
            system administrator
          </InfoRow>
        )}

        <NewTableMenu
          {...props}
          loadTable={(args) => {
            onClose?.();
            return loadTable(args);
          }}
        />

        <SchemaGraph
          tables={tables}
          connectionId={props.prgl.connectionId}
          db_schema_filter={props.prgl.connection.db_schema_filter}
          dbs={dbs}
          db={db}
          theme={theme}
        />
      </FlexRowWrap>
    </FlexCol>
  );
};
