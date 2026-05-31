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
  const { labelColumn, numericAxis, title } = generatedWindow;

  const funcDef = aggFunctions.find(
    (f) =>
      f.key ===
      (numericAxis.aggregation === "count(*)" ?
        "$countAll"
      : "$" + numericAxis.aggregation),
  )!;
  const xColName =
    numericAxis.aggregation === "count(*)" ?
      "Count"
    : `${funcDef.name}(${numericAxis.column})`;
  const table =
    "table_name" in generatedWindow ?
      tables.find((t) => t.name === generatedWindow.table_name)
    : undefined;
  const { joinPath } = numericAxis;
  const xAxisTable =
    !joinPath ? table : tables.find((t) => t.name === joinPath.at(-1)?.table);
  const xAxisColumnInfo =
    numericAxis.aggregation === "count(*)" ?
      undefined
    : xAxisTable?.columns.find((c) => c.name === numericAxis.column);

  const xAxisColumn: NonNullable<WindowData["columns"]>[number] = {
    name: xColName,
    width: 250,
    show: true,
    computedConfig: {
      column:
        numericAxis.column === "count(*)" ? undefined : numericAxis.column,
      ...(funcDef.outType === "sameAsInput" ?
        pickKeys(xAxisColumnInfo!, ["tsDataType", "udt_name"])
      : funcDef.outType),
      funcDef: {
        ...funcDef,
        subLabel: "",
      },
    },
  };

  const columns: WindowData["columns"] = [
    {
      name: labelColumn,
      width: 150,
      show: true,
    },
    !joinPath ?
      {
        ...xAxisColumn,
        style: {
          type: "Barchart",
          barColor: "#0081A7",
          textColor: "",
        },
      }
    : {
        name: xColName,
        show: true,
        style: {
          type: "Barchart",
          barColor: "#0081A7",
          textColor: "",
        },
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
  table?.columns.forEach((col) => {
    if (col.name !== labelColumn) {
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
    // sort: [{ key: xColName, asc: false, nulls: "last" }] satisfies NonNullable<
    //   WindowData["sort"]
    // >,
  } satisfies WindowInsertModel;
};
