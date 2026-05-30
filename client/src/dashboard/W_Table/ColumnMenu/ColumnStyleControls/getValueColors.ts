import type { DBHandlerClient, TableHandlerClient } from "prostgles-client";
import type { AnyObject, SQLHandler } from "prostgles-types";
import type { Theme } from "src/App";
import { chipColorsFadedBorder } from "../ColumnDisplayFormat/ChipStylePalette";
import type { DBS } from "src/dashboard/Dashboard/DBS";
import { getRandomElement } from "@common/utils";
import type { ConditionalStyle } from "./ColumnStyleControls";
import type { ColumnConfig } from "../ColumnMenu";
import { getComputedColumnSelect } from "../../tableUtils/getTableSelect";
import { getSingleShownNestedColumn } from "../../tableUtils/StyledTableColumn";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";

export type DefaultConditionalStyleArgs =
  | {
      type: "table";
      db: DBHandlerClient | DBS;
      tableName: string;
      column: ColumnConfig;
      filter?: AnyObject;
      theme: Theme;
      tables: DBSchemaTableWJoins[];
    }
  | {
      type: "sql";
      sql: SQLHandler;
      query: string;
      columnName: string;
      theme: Theme;
    };
export const DefaultConditionalStyleLimit = 5;
export const getValueColors = async (
  args: DefaultConditionalStyleArgs,
  setStyle: (newStyle: ConditionalStyle) => void,
) => {
  const { theme } = args;
  const values = await fetchColumnValues(args);
  if (!values) return;
  const prevSyleIndexes = new Set<number>();
  setStyle({
    type: "Conditional",
    conditions: values.map((v) => {
      const nonPickedStyles =
        prevSyleIndexes.size === chipColorsFadedBorder.length ?
          chipColorsFadedBorder
        : chipColorsFadedBorder.filter((_, i) => !prevSyleIndexes.has(i));
      const { elem: style, index } = getRandomElement(nonPickedStyles);
      prevSyleIndexes.add(index);
      return {
        condition: v,
        operator: "=",
        ...style,
        textColor: theme === "dark" ? style.textColorDarkMode : style.textColor,
        chipColor: style.color,
      };
    }),
  });
};

export const fetchColumnValues = async (args: DefaultConditionalStyleArgs) => {
  if (args.type === "table") {
    const { column, db, tableName: tableNameRaw, filter = {}, tables } = args;
    const tableName = column.nested?.path.at(-1)?.table ?? tableNameRaw;
    const firstNestedColumn = getSingleShownNestedColumn(column, tables);
    const select =
      firstNestedColumn ?
        {
          [firstNestedColumn.shownCol.name]:
            firstNestedColumn.shownCol.computedConfig ?
              getComputedColumnSelect(firstNestedColumn.shownCol.computedConfig)
            : 1,
        }
      : {
          [column.name]:
            column.computedConfig ?
              getComputedColumnSelect(column.computedConfig)
            : 1,
        };
    const tableHandler = db[tableName] as TableHandlerClient | undefined;
    if (!tableHandler?.find) return undefined;
    const rows = await tableHandler.find(filter, {
      //@ts-ignore
      select,
      limit: DefaultConditionalStyleLimit,
      groupBy: true,
    });
    const values = rows.map((v) => Object.values(v)[0]) as string[];
    return values;
  }
  const { sql } = args;

  const values = await sql(
    `SELECT DISTINCT \${columnName:name} 
      FROM (
        ${args.query}
      ) t 
      LIMIT ${DefaultConditionalStyleLimit}`,
    { columnName: args.columnName },
    { returnType: "values" },
  );
  return values as string[];
};
