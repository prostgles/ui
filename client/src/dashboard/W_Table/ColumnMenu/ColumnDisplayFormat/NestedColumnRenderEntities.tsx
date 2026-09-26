import Btn from "@components/Btn";
import React from "react";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type { DBSchemaTableWithRenderInfo } from "../../../Dashboard/getTables";
import { ViewMoreSmartCardList } from "../../../SmartForm/SmartFormField/ViewMoreSmartCardList";
import { RenderColumnAction } from "../../RenderColumn/RenderColumnAction";
import type { ColumnConfigWithInfo } from "../../W_Table";
import type { ColumnConfig } from "../ColumnConfig";
import { getLinkedRecordsFilter } from "./getLinkedRecordsFilter";
import { LinkedRecordSummary } from "./LinkedRecordSummary";

export const NestedColumnRenderEntities = ({
  column,
  table,
  tables,
  rows,
  parentRow,
  rootTableName,
  shownColumns,
}: {
  column: ColumnConfig;
  table: DBSchemaTableWithRenderInfo;
  tables: DBSchemaTableWithRenderInfo[];
  rows: Record<string, unknown>[];
  parentRow: Record<string, unknown>;
  rootTableName: string;
  shownColumns: ColumnConfigWithInfo[];
}) => {
  const { db, methods, sql } = usePrgl();
  const previewLimit = column.nested!.limit ?? rows.length;
  const linkedRecordsFilter = getLinkedRecordsFilter({
    column,
    parentRow,
    nestedRow: undefined,
    rootTableName,
  });
  return (
    <div className="flex-row-wrap gap-p25">
      {rows.slice(0, previewLimit).map((row, index) => (
        <RenderColumnAction
          key={index}
          column={{ ...column, udt_name: "jsonb", tsDataType: "any[]" }}
          row={row}
          table={table}
          tables={tables}
          barchartVals={undefined}
          relatedRecords={
            linkedRecordsFilter && {
              ...linkedRecordsFilter,
              rootTableName,
              popupTitle: column.label || column.name,
            }
          }
        >
          <LinkedRecordSummary
            row={row}
            shownNestedColumns={shownColumns}
            table={table}
          />
        </RenderColumnAction>
      ))}
      {rows.length > previewLimit &&
        linkedRecordsFilter &&
        db[table.name]?.find && (
          <ViewMoreSmartCardList
            db={db}
            methods={methods}
            sql={sql}
            tables={tables}
            ftable={table}
            getActions={undefined}
            rootTableName={rootTableName}
            searchFilter={linkedRecordsFilter.searchFilter}
            popupTitle={column.label || column.name}
            renderButton={({ onClick }) => (
              <Btn
                variant="text"
                size="small"
                onClick={onClick}
                data-command="LinkedColumn.ViewAll"
              >
                View all
              </Btn>
            )}
          />
        )}
    </div>
  );
};
