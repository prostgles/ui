import { FlexCol, FlexRow } from "@components/Flex";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import { SvgIcon } from "@components/SvgIcon";
import React from "react";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import type { getColumnsWithInfo } from "../../tableUtils/getColumnsWithInfo";
import { Avatar } from "./Avatar";
import { getColumnFormat } from "./getFormatColumnSelect";

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
  const subHeaderColumn =
    getAvailableColumn(table.card?.subHeaderColumn, headerColumn?.name) ??
    getAvailableColumn(
      fallbackColumns.find(({ name }) => name !== headerColumn?.name)?.name,
    );
  const avatarColumn = getAvailableColumn(table.card?.avatarColumn);
  const avatarConfig = shownNestedColumns.find(
    (column) => column.name === avatarColumn?.name,
  );
  const avatarFormat = avatarConfig && getColumnFormat(avatarConfig);
  const avatarUrl =
    avatarColumn && typeof row[avatarColumn.name] === "string" ?
      (row[avatarColumn.name] as string)
    : undefined;
  const remainingColumns = shownNestedColumns.filter(
    (column) =>
      ![avatarColumn?.name, headerColumn?.name, subHeaderColumn?.name].includes(
        column.name,
      ),
  );

  return (
    <FlexRow className="gap-p5 ai-center ta-left">
      {avatarConfig && avatarFormat?.type === "Avatar" ?
        <Avatar
          value={row[avatarConfig.name]}
          row={row}
          column={avatarConfig}
          table={table}
          params={avatarFormat.params}
        />
      : avatarUrl ?
        <MediaViewer
          style={{
            width: "2em",
            height: "2em",
            borderRadius: "50%",
            overflow: "hidden",
          }}
          url={avatarUrl}
          content_type="image"
        />
      : table.icon ?
        <SvgIcon icon={table.icon} size={20} />
      : null}
      <FlexCol className="gap-0 min-w-0">
        {headerColumn && (
          <div>
            <RenderValue column={headerColumn} value={row[headerColumn.name]} />
          </div>
        )}
        {subHeaderColumn && (
          <div className="text-2 font-12">
            <RenderValue
              column={subHeaderColumn}
              value={row[subHeaderColumn.name]}
            />
          </div>
        )}
      </FlexCol>
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
