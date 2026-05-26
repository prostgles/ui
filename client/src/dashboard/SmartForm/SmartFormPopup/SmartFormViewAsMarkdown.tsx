import { isObject } from "@common/publishUtils";
import { JOINED_RECORD_PROP_NAMES, Marked } from "@components/Chat/Marked";
import React from "react";
import type { SmartColumnInfo } from "../SmartFormField/SmartFormField";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

export const SmartFormViewAsMarkdown = ({
  displayedColumns,
  currentRow,
}: {
  displayedColumns: SmartColumnInfo[];
  currentRow: Record<string, unknown> | undefined;
}) => {
  const prgl = usePrgl();
  if (!currentRow) return null;

  const markdown = displayedColumns
    .map((col) => {
      const value = currentRow[col.name];
      return `**${col.label || col.name}:**  \n${getColumnValueAsMarkdown(col, value)}  `;
    })
    .filter(Boolean)
    .join("\n\n<br/>\n\n");

  return (
    <Marked
      className="f-1 p-1"
      codeHeader={undefined}
      content={markdown}
      prgl={prgl}
      loadedSuggestions={undefined}
      sqlHandler={undefined}
    />
  );
};

const getColumnValueAsMarkdown = (
  column: SmartColumnInfo,
  value: unknown,
): string => {
  if (value === undefined) return "";
  if (value === null) return "<i>NULL</i>";

  const valueStr = (() => {
    if (typeof value === "string") return value;
    if (
      typeof value === "boolean" ||
      typeof value === "number" ||
      typeof value === "bigint"
    ) {
      return value.toString();
    }
    if (
      isObject(value) ||
      Array.isArray(value) ||
      column.udt_name.startsWith("json")
    ) {
      return "```json\n" + JSON.stringify(value, null, 2) + "\n```";
    }

    return JSON.stringify(value);
  })();

  /** Construct referenced record link */
  const [firstRef, ...otherRefs] = column.references || [];
  if (firstRef && !otherRefs.length) {
    const data = {
      "#record": "#record",
      tableName: firstRef.ftable,
      columnName: firstRef.fcols[0],
      columnValue: value,
    };
    const props = Object.entries(JOINED_RECORD_PROP_NAMES)
      .map(
        ([propName, dataAttr]) =>
          `${dataAttr}=${JSON.stringify(data[propName])}`,
      )
      .join(" ");
    return `<a ${props}>${valueStr}</a>`;
  }

  return valueStr;
};
