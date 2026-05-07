import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import {
  SearchList,
  type SvgIconName,
} from "@components/SearchList/SearchList";
import { mdiFilter, mdiRefresh } from "@mdi/js";
import { SchemaFilter } from "@pages/NewConnection/SchemaFilter";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { t } from "src/i18n/i18nUtils";
import { useAddViewToWorkspace } from "../Dashboard/useAddViewToWorkspace";
import { ensureFadeDoesNotShowForOneItem } from "./DashboardMenuContent";
import { useTableSizeInfo } from "./useTableSizeInfo";

export const TableList = ({
  workspace,
  onClose,
}: {
  workspace: DBSSchema["workspaces"];
  onClose: VoidFunction | undefined;
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

  const { tablesWithInfo, isLoading } = useTableSizeInfo(workspace.options);
  const { addViewToWorkspace } = useAddViewToWorkspace();

  if (isLoading) {
    return <Loading />;
  }
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
        autoFocus: true,
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
          iconLeft: {
            type: "SvgIcon",
            pathName:
              (table.icon as SvgIconName | undefined) ||
              (table.isFileTable ? "File"
              : db[table.name]?.insert ? "TableEdit"
              : "TableEye"),
            title:
              table.isFileTable ? "File table"
              : table.isView ? "View"
              : "Table",
            "data-command":
              table.isFileTable ? "dashboard.menu.fileTable" : undefined,
          },
          key: table.name,
          label: table.label,
          title: table.comment,
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
