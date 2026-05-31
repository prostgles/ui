import type {
  TableColumn,
  TableWindowInsertModel,
} from "@common/DashboardTypes";
import { type DBSSchemaForInsert } from "@common/publishUtils";
import { isDefined, pickKeys } from "prostgles-types";
import type { Prgl } from "src/App";
import type { WindowData } from "src/dashboard/Dashboard/dashboardUtils";
import type { ColumnConfig } from "src/dashboard/W_Table/ColumnMenu/ColumnMenu";
import { CHIP_COLOR_NAMES } from "../../../W_Table/ColumnMenu/ColumnDisplayFormat/ChipStylePalette";

export const loadGeneratedTable = (
  generatedWindow: TableWindowInsertModel,
  tables: Prgl["tables"],
) => {
  const columns = generatedWindow.columns?.map((c) => {
    const { computedConfig, nested } = c;
    const nestedTable =
      nested && tables.find((t) => t.name === nested.path.at(-1)?.table);
    return {
      ...c,
      nested:
        nested &&
        ({
          ...nested,

          chart:
            "chart" in nested ?
              {
                dateCol: nested.chart.dateCol,
                type: nested.chart.type,
                yAxis: nested.chart.yAxis,
                renderStyle: "smooth-line",
              }
            : undefined,
          columns:
            "columns" in nested ?
              [
                ...nested.columns.map((nc) => {
                  return {
                    ...nc,
                    show: true,
                    computedConfig:
                      nc.computedConfig &&
                      parseComputedConfig(
                        nc.computedConfig,
                        tables,
                        nested.path.at(-1)!.table,
                      ),
                  } as ColumnConfig;
                }),
                ...nestedTable!.columns
                  .filter((c) => {
                    return !nested.columns.some(
                      (nc) => !nc.computedConfig && nc.name === c.name,
                    );
                  })
                  .map((c) => ({
                    name: c.name,
                    show: false,
                  })),
              ]
            : [],
        } satisfies ColumnConfig["nested"]),
      computedConfig:
        computedConfig &&
        parseComputedConfig(computedConfig, tables, generatedWindow.table_name),
      show: true,
      style:
        c.styling?.type === "conditional" ?
          {
            type: "Conditional",
            conditions: c.styling.conditions.map((cond) => {
              // "textColor": "#ffffff",
              // "textColorDarkMode": "#2386d5",
              // "chipColor": "#673AB7"
              const style =
                Object.entries(CHIP_COLOR_NAMES).find(
                  ([k]) => k === cond.chipColor,
                )?.[1] ?? CHIP_COLOR_NAMES.blue!;
              return {
                condition: cond.value,
                operator: cond.operator,
                textColor: style.textColor,
                chipColor: style.color,
                textColorDarkMode: style.textColorDarkMode,
              };
            }),
          }
        : c.styling,
    };
  });
  const {
    sort,
    filter,
    filterOperand,
    quickFilterGroups,
    // cardLayout,
    table_name,
    title,
  } = generatedWindow;
  return {
    type: "table",
    title,
    columns,
    filter,
    options: {
      filterOperand,
      quickFilterGroups,
      // cardLayout,
    } satisfies WindowData<"table">["options"],
    sort: sort
      ?.map((s) => {
        const nestedCol = columns?.find((c) => c.name === s.key && c.nested);
        if (nestedCol) {
          return {
            ...s,
            key: `${s.key}.value`,
          };
        }
        return s;
      })
      .filter(isDefined),
    table_name,
  } satisfies Omit<DBSSchemaForInsert["windows"], "last_updated" | "user_id">;
};

const parseComputedConfig = (
  computedConfig: NonNullable<TableColumn["computedConfig"]>,
  tables: Prgl["tables"],
  table_name: string,
) => {
  const table = tables.find((t) => t.name === table_name);
  const computedConfigColumn =
    computedConfig.aggregation !== "countAll" ?
      table?.columns.find((col) => col.name === computedConfig.column)
    : undefined;
  const colTypes = pickKeys(
    computedConfigColumn ??
      ({
        tsDataType: "string",
        udt_name: "int8",
      } as const),
    ["tsDataType", "udt_name"],
  );
  return {
    column: computedConfigColumn?.name,
    ...colTypes,
    funcDef: {
      key: "$" + computedConfig.aggregation,
      outType: colTypes,
      name: computedConfig.aggregation,
      label: computedConfig.aggregation.toUpperCase(),
      subLabel: "",
      isAggregate: true,
      isAllowedForColumn: true,
    },
  };
};
