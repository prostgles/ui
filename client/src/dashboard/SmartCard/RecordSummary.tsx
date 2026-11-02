import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { FlexCol } from "@components/Flex";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import { SvgIcon } from "@components/SvgIcon";
import React from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { RenderValue } from "../SmartForm/SmartFormField/RenderValue";
import { Avatar } from "../W_Table/ColumnMenu/ColumnDisplayFormat/Avatar";
import { getColumnFormat } from "../W_Table/ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";
import { RenderColumnValue } from "../W_Table/RenderColumn/RenderColumn";

export const RecordSummary = <
  Column extends Omit<ColumnConfigWithInfo, "label">,
>({
  row,
  table,
  avatarColumn,
  avatarValue,
  headerColumn,
  subHeaderColumns,
  compact,
  hideEmptySubHeaders = true,
  renderHeader,
  renderSubHeader,
}: {
  row: Record<string, unknown>;
  table: DBSchemaTableWJoins;
  avatarColumn:
    | Pick<
        ColumnConfigWithInfo,
        | "name"
        | "format"
        | "info"
        | "style"
        | "nested"
        | "tsDataType"
        | "udt_name"
      >
    | undefined;
  avatarValue: unknown;
  headerColumn:
    | Pick<ColumnConfigWithInfo, "name" | "label" | "tsDataType" | "udt_name">
    | undefined;
  subHeaderColumns: Column[];
  compact: boolean;
  hideEmptySubHeaders?: boolean;
  renderHeader?: (renderedValue: React.ReactNode) => React.ReactNode;
  renderSubHeader?: (
    column: Column,
    renderedValue: React.ReactNode,
  ) => React.ReactNode;
}) => {
  const avatarFormat = avatarColumn && getColumnFormat(avatarColumn);
  const avatarUrl = typeof avatarValue === "string" ? avatarValue : undefined;
  const visibleSubHeaderColumns = subHeaderColumns.filter(
    (column) => !hideEmptySubHeaders || row[column.name] != null,
  );
  const headerValue = headerColumn && (
    <RenderValue column={headerColumn} value={row[headerColumn.name]} />
  );

  return (
    <>
      {avatarColumn && avatarFormat?.type === "Avatar" ?
        <Avatar
          value={row[avatarColumn.name]}
          row={row}
          column={avatarColumn}
          table={table}
          params={avatarFormat.params}
        />
      : avatarUrl ?
        <MediaViewer
          style={{
            width: compact ? "2em" : "3em",
            height: compact ? "2em" : "3em",
            borderRadius: "50%",
            overflow: "hidden",
            ...(!compact && {
              flex: "none",
              alignSelf: "center",
              border: "1px solid var(--b-color)",
            }),
          }}
          url={avatarUrl}
          content_type="image"
        />
      : compact && table.icon ?
        <SvgIcon icon={table.icon} size={20} />
      : null}
      <FlexCol
        className={compact ? "gap-0 min-w-0" : "f-1 min-w-0 gap-p25"}
        style={compact ? undefined : { overflowWrap: "anywhere" }}
      >
        {headerColumn && (
          <div
            className={compact ? undefined : "w-full f-1"}
            title={
              compact ? undefined : headerColumn.label || headerColumn.name
            }
            style={
              compact ? undefined : { fontWeight: "bold", fontSize: "1.1em" }
            }
          >
            {renderHeader ? renderHeader(headerValue) : headerValue}
          </div>
        )}
        {!!visibleSubHeaderColumns.length && (
          <div
            className={compact ? "text-2 font-12" : "w-full f-1 text-1"}
            style={compact ? undefined : { fontSize: "0.9em" }}
          >
            {visibleSubHeaderColumns.map((column, index) => (
              <React.Fragment key={column.name}>
                {index > 0 && " · "}
                <span title={column.info?.label || column.name}>
                  {renderSubHeader ?
                    renderSubHeader(
                      column,
                      <RenderValue column={column} value={row[column.name]} />,
                    )
                  : column.name === avatarColumn?.name ?
                    <RenderValue column={column} value={row[column.name]} />
                  : <RenderColumnValue
                      column={{ ...column, label: column.info?.label }}
                      row={row}
                      table={table}
                      getValues={() => [row[column.name]]}
                      maxCellChars={undefined}
                    />
                  }
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </FlexCol>
    </>
  );
};
