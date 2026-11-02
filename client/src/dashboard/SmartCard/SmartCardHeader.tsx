import { FlexRow } from "@components/Flex";
import React from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { RecordSummary } from "./RecordSummary";
import type { ParsedFieldConfig, SmartCardProps } from "./SmartCard";

export const SmartCardHeader = ({
  fields,
  table,
  row,
  fullData,
  infoLevel,
  renderTitle,
}: {
  fields: ParsedFieldConfig[];
  table: DBSchemaTableWJoins;
  row: SmartCardProps["defaultData"];
  fullData: SmartCardProps["fullData"];
  infoLevel: 1 | 2;
  renderTitle: ((value: React.ReactNode) => React.ReactNode) | undefined;
}) => {
  const headers = fields.flatMap(({ cardHeader }) =>
    cardHeader ? [cardHeader] : [],
  );
  const avatarColumn = headers.find(({ isAvatar }) => isAvatar)?.column;
  const headerColumn = headers.find(({ isTitle }) => isTitle)?.column;
  const renderField = (name: string, fallback: React.ReactNode) =>
    fields
      .find((field) => field.name === name)
      ?.render?.(row[name], row, fullData) ?? fallback;

  return (
    <FlexRow className="SmartCardHeader w-full min-w-0 ai-start gap-p5">
      <RecordSummary
        table={table}
        row={row}
        avatarColumn={avatarColumn}
        avatarValue={avatarColumn && row[avatarColumn.name]}
        headerColumn={headerColumn}
        subHeaderColumns={headers
          .filter(({ isAvatar, isTitle }) => !isAvatar && !isTitle)
          .map(({ column }) => column)}
        compact={false}
        hideEmptySubHeaders={infoLevel === 1}
        renderHeader={(fallback) => {
          const value =
            headerColumn && headerColumn !== avatarColumn ?
              renderField(headerColumn.name, fallback)
            : fallback;
          return renderTitle ? renderTitle(value) : value;
        }}
        renderSubHeader={(column, fallback) =>
          renderField(column.name, fallback)
        }
      />
    </FlexRow>
  );
};
