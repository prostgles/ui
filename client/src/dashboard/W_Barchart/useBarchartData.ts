import { useState } from "react";
import type { W_BarchartProps } from "./W_Barchart";
import { usePromise } from "prostgles-client";
import {
  getSerialisableError,
  includes,
  type AnyObject,
} from "prostgles-types";

export const useBarchartData = ({
  myLinks,
  prgl,
  getLinksAndWindows,
}: Pick<W_BarchartProps, "myLinks" | "prgl" | "getLinksAndWindows">) => {
  const [sort, setSort] = useState<
    { column: string; direction: "asc" | "desc" } | undefined
  >(undefined);
  const { db } = prgl;
  const { windows } = getLinksAndWindows();
  const barChartData = usePromise(async () => {
    const firstLink = myLinks[0];
    if (!firstLink) {
      return {
        type: "error" as const,
        message: "No links found for barchart",
      };
    }

    const linkOpts = firstLink.options;
    if (linkOpts.type !== "barchart") {
      return {
        type: "error" as const,
        message: `Invalid link type for barchart: ${firstLink.options.type}`,
      };
    }
    const { sql } = db;
    const { columns, statType } = linkOpts;
    const [column] = columns;
    if (!column) {
      return {
        type: "error" as const,
        message: "No label column defined for barchart",
      };
    }
    const { colorArr, name: labelColumn } = column;
    const { dataSource } = linkOpts;
    if (dataSource?.type === "sql") {
      // const { dataSource } = linkOpts;
      if (!sql) {
        return {
          type: "error" as const,
          message: "Running SQL not allowed ",
        };
      }

      try {
        const sorting =
          sort ?
            `ORDER BY ${sort.column === "label" ? 1 : 2} ${sort.direction === "asc" ? "ASC" : "DESC"}`
          : "";
        const result = await sql(
          `
          SELECT ${[
            labelColumn + " AS label",
            statType ?
              `${statType.funcName}(${statType.numericColumn}) AS value`
            : "COUNT(*) AS value",
          ].join(", ")}
          FROM (
            ${dataSource.sql}
          ) prostgles_barchart_table
          GROUP BY 1
          ${sorting}
        `,
          undefined,
          {
            returnType: "default-with-rollback",
          },
        );
        return {
          type: "data" as const,
          linkOpts,
          rows: result.rows,
          labelColumn,
          colorArr,
          statType,
          ...getMinMax(result.rows),
        };
      } catch (error) {
        return {
          type: "error" as const,
          // message: `Error fetching barchart data: ${error}`,
          message: getSerialisableError(error),
        };
      }
    } else if (
      dataSource?.type === "local-table" ||
      dataSource?.type === "table"
    ) {
      const { w1_id, w2_id } = firstLink;
      const linkTable =
        w1_id !== w2_id ?
          windows.find(
            (w) => w.type === "table" && [w1_id, w2_id].includes(w.id),
          )
        : undefined;
      const tableName =
        dataSource.type === "local-table" ?
          dataSource.localTableName
        : linkTable?.table_name;
      const filter =
        dataSource.type === "local-table" ?
          dataSource.smartGroupFilter
        : undefined;
      const tableHandler = !tableName ? undefined : db[tableName];
      if (!tableHandler?.find) {
        return {
          type: "error" as const,
          message: `Local table ${tableName} not found/allowed`,
        };
      }

      const funcName = statType ? statType.funcName : "$countAll";
      const numericColumn = statType?.numericColumn;
      const rows = await tableHandler.find(filter, {
        select: {
          label: { $column: [labelColumn] },
          value: {
            [funcName]: numericColumn ? [numericColumn] : [],
          },
        },
        orderBy: sort && {
          key: sort.column,
          asc: sort.direction === "asc",
        },

        limit: 1000,
      });
      return {
        type: "data" as const,
        linkOpts,
        rows,
        labelColumn,
        colorArr,
        statType,
        ...getMinMax(rows),
      };
    }
  }, [myLinks, db, sort, windows]);

  return { barChartData, sort, setSort };
};

const getMinMax = (rows: AnyObject[]) => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let labelMaxWidth = 50;
  rows.forEach(({ value, label }) => {
    const val = value;
    if (typeof val === "number") {
      if (val < min) min = val;
      if (val > max) max = val;
    }
    const labelStr =
      includes(["string", "number"], typeof label) ?
        label.toString()
      : JSON.stringify(label || "");
    const labelLength = labelStr.length * 8;
    if (labelLength > labelMaxWidth) labelMaxWidth = labelLength;
  });
  if (min === Number.POSITIVE_INFINITY) min = 0;
  if (max === Number.NEGATIVE_INFINITY) max = 0;
  return { min, max, labelMaxWidth };
};
