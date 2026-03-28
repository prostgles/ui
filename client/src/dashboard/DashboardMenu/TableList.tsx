import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { InfoRow } from "@components/InfoRow";
import { SearchList } from "@components/SearchList/SearchList";
import { SvgIcon } from "@components/SvgIcon";
import {
  mdiFile,
  mdiFilter,
  mdiRefresh,
  mdiTableEdit,
  mdiTableEye,
} from "@mdi/js";
import { SchemaFilter } from "@pages/NewConnection/SchemaFilter";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { t } from "src/i18n/i18nUtils";
import { ensureFadeDoesNotShowForOneItem } from "./DashboardMenuContent";
import { useTableSizeInfo } from "./useTableSizeInfo";
import type { DBSSchema } from "@common/publishUtils";
import { useAddViewToWorkspace } from "../Dashboard/useAddViewToWorkspace";

export const TableList = ({
  workspace,
  onClose,
}: {
  workspace: DBSSchema["workspaces"];
  onClose?: VoidFunction;
}) => {
  const {
    tables,
    connection,
    sql,
    connectionId,
    dbs,
    dbsMethods: { reloadSchema },
    db,
  } = usePrgl();

  const { tablesWithInfo } = useTableSizeInfo(workspace.options);
  const { addViewToWorkspace } = useAddViewToWorkspace();

  if (!tables.length) {
    return <div className="text-1p5 p-1">0 tables/views</div>;
  }
  return (
    <SearchList
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
              variant: "text",
              size: "small",
              className: "mr-p5",
            },
            label: "",
          }}
          sql={sql}
          db_schema_filter={connection.db_schema_filter}
          onChange={(newDbSchemaFilter) => {
            void dbs.connections.update(
              {
                id: connectionId,
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
              await reloadSchema!({ conId: connectionId });
            }}
            iconPath={mdiRefresh}
          >
            Refresh schema
          </Btn>
        </FlexCol>
      }
      items={tablesWithInfo.map((table) => {
        return {
          contentLeft: (
            <div
              data-command={
                table.info.isFileTable ? "dashboard.menu.fileTable" : undefined
              }
              className="flex-col ai-start f-0 text-1"
            >
              {table.icon ?
                <SvgIcon icon={table.icon} />
              : <Icon
                  title={
                    table.info.isFileTable ? "File table"
                    : table.info.isView ?
                      "View"
                    : "Table"
                  }
                  path={
                    table.info.isFileTable ? mdiFile
                    : db[table.name]?.insert ?
                      mdiTableEdit
                    : mdiTableEye
                  }
                />
              }
            </div>
          ),
          key: table.name,
          label: table.label,
          title: table.info.comment,
          contentRight: table.endText.length > 0 && (
            <span title={table.endTitle} className="text-2 ml-auto">
              {table.endText}
            </span>
          ),
          onPress: () => {
            void addViewToWorkspace({
              workspace_id: workspace.id,
              type: "table",
              table: table.name,
              name: table.label,
            });
            onClose?.();
          },
        };
      })}
    />
  );
};
