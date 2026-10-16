import type { UserColumnFormat } from "@common/columnDisplayFormat.schema";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { DEFAULT_CHIP_STYLE } from "@common/ColumnConfig/chipColors";
import type { DBSchemaTable } from "prostgles-types";
import React from "react";
import { getColumnValueStyle } from "../../RenderColumn/StyledTableColumn";

export const Avatar = ({
  value,
  row,
  column,
  table,
  params,
}: {
  value: unknown;
  row: Record<string, unknown>;
  column: Pick<
    ColumnConfigWithInfo,
    "name" | "style" | "nested" | "tsDataType" | "udt_name"
  >;
  table: DBSchemaTable | undefined;
  params: Extract<UserColumnFormat, { type: "Avatar" }>["params"];
}) => {
  const name =
    params?.firstNameColumn || params?.lastNameColumn ?
      [params.firstNameColumn, params.lastNameColumn]
        .map((columnName) => columnName && row[columnName])
        .filter(
          (part): part is string => typeof part === "string" && !!part.trim(),
        )
        .join(" ")
    : typeof value === "string" ? value.trim()
    : "";
  if (!name) return null;

  const words = name.trim().split(/\s+/);
  const fullName = words.join(" ");
  const initials = [words[0], words.length > 1 ? words.at(-1) : undefined]
    .map((word) => (word ? Array.from(word)[0] : ""))
    .join("")
    .toLocaleUpperCase();
  const colors =
    table &&
    getColumnValueStyle({
      column,
      table,
      row,
      barchartVals: undefined,
    });
  return (
    <span
      role="img"
      aria-label={fullName}
      title={fullName}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: "2.25em",
        height: "2.25em",
        borderRadius: "50%",
        backgroundColor: colors?.chipColor ?? DEFAULT_CHIP_STYLE.color,
        color: colors?.textColor ?? DEFAULT_CHIP_STYLE.textColor,
        border:
          colors?.borderColor ? `1px solid ${colors.borderColor}` : undefined,
        fontWeight: column.style?.fontWeight ?? "bold",
        lineHeight: 1,
      }}
    >
      {initials}
    </span>
  );
};
