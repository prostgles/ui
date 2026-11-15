import { FlexRow } from "@components/Flex";
import React from "react";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import { RecordSummary } from "../../../SmartCard/RecordSummary";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import type { getColumnsWithInfo } from "../../tableUtils/getColumnsWithInfo";

export const LinkedRecordSummary = ({
  row,
  shownNestedColumns,
  table,
}: {
  row: Record<string, unknown>;
  shownNestedColumns: ReturnType<typeof getColumnsWithInfo>;
  table: DBSchemaTableWithRenderInfo;
}) => {
  const fallbackColumns = shownNestedColumns.filter(
    (column) => !column.computedConfig && row[column.name] !== undefined,
  );
  const getAvailableColumn = (
    preferredName: string | undefined,
    excludedName?: string,
  ) =>
    (
      preferredName !== excludedName &&
      fallbackColumns.some(({ name }) => name === preferredName)
    ) ?
      table.columns.find(({ name }) => name === preferredName)
    : undefined;
  const headerColumn =
    getAvailableColumn(table.card?.headerColumn) ??
    getAvailableColumn(fallbackColumns[0]?.name);
  const subHeaderNames = table.card?.subHeaderColumns ?? [
    table.card?.subHeaderColumn,
  ];
  const preferredSubHeaderColumns = subHeaderNames.flatMap((name) => {
    const column = fallbackColumns.find(
      (column) => column.name === name && column.name !== headerColumn?.name,
    );
    return column ? [column] : [];
  });
  const subHeaderColumns =
    table.card?.subHeaderColumns || preferredSubHeaderColumns.length ?
      preferredSubHeaderColumns
    : fallbackColumns
        .filter((column) => column.name !== headerColumn?.name)
        .slice(0, 1);
  const avatarColumn = getAvailableColumn(table.card?.avatarColumn);
  const avatarConfig = shownNestedColumns.find(
    (column) => column.name === avatarColumn?.name,
  );
  const remainingColumns = shownNestedColumns.filter(
    (column) =>
      ![avatarColumn?.name, headerColumn?.name].includes(column.name) &&
      !subHeaderColumns.some((subHeader) => subHeader.name === column.name),
  );

  return (
    <FlexRow className="gap-p5 ai-center ta-left">
      <RecordSummary
        row={row}
        table={table}
        avatarColumn={avatarConfig}
        avatarValue={avatarColumn && row[avatarColumn.name]}
        headerColumn={headerColumn}
        subHeaderColumns={subHeaderColumns}
        compact={true}
      />
      {remainingColumns.length > 0 && (
        <FlexRow className="gap-p5 min-w-0">
          {remainingColumns.map((column) => (
            <div key={column.name} className="min-w-0">
              <RenderValue column={column} value={row[column.name]} />
            </div>
          ))}
        </FlexRow>
      )}
    </FlexRow>
  );
};
