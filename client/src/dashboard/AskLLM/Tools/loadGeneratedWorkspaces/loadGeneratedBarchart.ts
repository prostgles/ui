import type { BarchartWindowInsertModel } from "@common/DashboardTypes";
import type { WindowInsertModel } from "./loadGeneratedWorkspaces";
import type {
  DBSchemaTableWJoins,
  WindowData,
} from "src/dashboard/Dashboard/dashboardUtils";
import { aggFunctions } from "src/dashboard/W_Table/ColumnMenu/FunctionSelector";

export const loadGeneratedBarchart = (
  generatedWindow: BarchartWindowInsertModel,
  tables: DBSchemaTableWJoins[],
): WindowInsertModel => {
  const { xAxis, yAxisColumn, title } = generatedWindow;

  const funcDef = aggFunctions.find(
    (f) =>
      f.key === (xAxis === "count(*)" ? "$countAll" : "$" + xAxis.aggregation),
  )!;
  const xColName =
    xAxis === "count(*)" ? "Count" : `${funcDef.name}(${xAxis.column})`;

  const columns: WindowData["columns"] = [
    {
      name: yAxisColumn,
      width: 150,
      show: true,
    },
    {
      name: xColName,
      width: 250,
      show: true,
      computedConfig: {
        column: xAxis === "count(*)" ? undefined : xAxis.column,
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
    },
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
  const otherColumns = tables.find((t) => t.name === table_name)?.columns;
  otherColumns?.forEach((col) => {
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
