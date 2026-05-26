import type { BarchartWindowInsertModel } from "@common/DashboardTypes";
import type { WindowInsertModel } from "./loadGeneratedWorkspaces";
import type {
  DBSchemaTableWJoins,
  WindowData,
} from "src/dashboard/Dashboard/dashboardUtils";
import { aggFunctions } from "src/dashboard/W_Table/ColumnMenu/FunctionSelector/functions";
import { pickKeys } from "prostgles-types";

export const loadGeneratedBarchart = (
  generatedWindow: BarchartWindowInsertModel,
  tables: DBSchemaTableWJoins[],
): WindowInsertModel => {
  const { xAxis, yAxisColumn, title } = generatedWindow;

  const funcDef = aggFunctions.find(
    (f) =>
      f.key ===
      (xAxis.aggregation === "count(*)" ?
        "$countAll"
      : "$" + xAxis.aggregation),
  )!;
  const xColName =
    xAxis.aggregation === "count(*)" ?
      "Count"
    : `${funcDef.name}(${xAxis.column})`;
  const table =
    "table_name" in generatedWindow ?
      tables.find((t) => t.name === generatedWindow.table_name)
    : undefined;
  const { joinPath } = xAxis;
  const xAxisTable =
    !joinPath ? table : tables.find((t) => t.name === joinPath.at(-1)?.table);
  const xAxisColumnInfo =
    xAxis.aggregation === "count(*)" ?
      undefined
    : xAxisTable?.columns.find((c) => c.name === xAxis.column);

  const xAxisColumn: NonNullable<WindowData["columns"]>[number] = {
    name: xColName,
    width: 250,
    show: true,
    computedConfig: {
      column: xAxis.column === "count(*)" ? undefined : xAxis.column,
      ...(funcDef.outType === "sameAsInput" ?
        pickKeys(xAxisColumnInfo!, ["tsDataType", "udt_name"])
      : funcDef.outType),
      funcDef: {
        ...funcDef,
        subLabel: "",
      },
    },
    style: {
      type: "Barchart",
      barColor: "#0081A7",
      textColor: "",
    },
  };

  const columns: WindowData["columns"] = [
    {
      name: yAxisColumn,
      width: 150,
      show: true,
    },
    joinPath ?
      {
        name: xColName,
        nested: {
          path: joinPath,
          columns: [
            xAxisColumn,
            ...xAxisTable!.columns.map((col) => ({
              name: col.name,
              show: false,
            })),
          ],
        },
      }
    : xAxisColumn,
  ];
  if ("sql" in generatedWindow) {
    return {
      type: "sql",
      name: generatedWindow.title ?? "Barchart SQL",
      sql: generatedWindow.sql,
      columns,
    };
  }

  const { table_name, filter, filterOperand, quickFilterGroups } =
    generatedWindow;
  table?.columns.forEach((col) => {
    if (col.name !== yAxisColumn) {
      columns.push({
        name: col.name,
        show: false,
      });
    }
  });
  return {
    type: "table",
    title,
    table_name,
    columns,
    filter,
    options: {
      filterOperand,
      quickFilterGroups,
      hideEditRow: true,
      hideInsertButton: true,
    } satisfies WindowData<"table">["options"],
    sort: [{ key: xColName, asc: false, nulls: "last" }] satisfies NonNullable<
      WindowData["sort"]
    >,
  } satisfies WindowInsertModel;
};
