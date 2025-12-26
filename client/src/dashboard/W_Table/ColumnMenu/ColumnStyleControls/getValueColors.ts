import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import type { Theme } from "src/App";
import { chipColorsFadedBorder } from "../ColumnDisplayFormat/ChipStylePalette";
import { getRandomElement, type ConditionalStyle } from "./ColumnStyleControls";

type DefaultConditionalStyleArgs =
  | {
      type: "table";
      db: DBHandlerClient;
      tableName: string;
      columnName: string;
      filter?: AnyObject;
      theme: Theme;
    }
  | {
      type: "sql";
      db: DBHandlerClient;
      query: string;
      columnName: string;
      theme: Theme;
    };
export const DefaultConditionalStyleLimit = 5;
export const getValueColors = async (
  args: DefaultConditionalStyleArgs,
  setStyle: (newStyle: ConditionalStyle) => void,
) => {
  const { theme, db } = args;
  const values = await (async () => {
    if (args.type === "table") {
      const { columnName, db, tableName, filter = {} } = args;
      const tableHandler = db[tableName];
      if (!tableHandler?.find) return undefined;
      const rows = await tableHandler.find(filter, {
        select: { [columnName]: 1 },
        limit: DefaultConditionalStyleLimit,
        groupBy: true,
      });
      const values = rows.map((v) => v[columnName]) as string[];
      return values;
    }

    const values = await db.sql!(
      `SELECT DISTINCT \${columnName:name} 
      FROM (
        ${args.query}
      ) t 
      LIMIT ${DefaultConditionalStyleLimit}`,
      { columnName: args.columnName },
      { returnType: "values" },
    );
    return values as string[];
  })();
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
