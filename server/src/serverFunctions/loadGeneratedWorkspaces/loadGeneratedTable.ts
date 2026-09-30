import type { WorkspaceTable } from "./loadGeneratedWorkspaces";
import { CHIP_COLOR_NAMES } from "@common/ColumnConfig/chipColors";
import type {
  TableColumn,
  TableWindowInsertModel,
} from "@common/DashboardTypes";
import { type DBSSchemaForInsert } from "@common/publishUtils";
import { MINI_BARCHART_COLOR } from "@common/ColumnConfig/COLOR_PALETTE";
import { isDefined, pickKeys } from "prostgles-types";
import type { WindowData } from "@common/ColumnConfig/WindowData";
import type {
  ColumnConfig,
  NestedColumn,
} from "@common/ColumnConfig/ColumnConfig";

export const loadGeneratedTable = (
  generatedWindow: Omit<TableWindowInsertModel, "id">,
  tables: WorkspaceTable[],
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
          path: nested.path,
          joinType: nested.joinType,
          ...("limit" in nested && { limit: nested.limit }),

          display:
            "chart" in nested ?
              {
                dateCol: nested.chart.dateCol,
                type: "timechart",
                yAxis: nested.chart.yAxis,
                renderStyle: "smooth-line",
              }
            : nested.display,
          columns:
            "columns" in nested ?
              [
                ...nested.columns.map((nc) => {
                  return {
                    ...nc,
                    show: nc.show ?? true,
                    style: parseColumnStyle(nc.styling),
                    computedConfig:
                      nc.computedConfig &&
                      parseComputedConfig(
                        nc.computedConfig,
                        tables,
                        nested.path.at(-1)!.table,
                      ),
                  } as NestedColumn<ColumnConfig>;
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
      show: c.show ?? true,
      style: parseColumnStyle(c.styling),
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
  computedConfig: NonNullable<
    TableColumn["computedConfig"] | ColumnConfig["computedConfig"]
  >,
  tables: WorkspaceTable[],
  table_name: string,
) => {
  if ("funcDef" in computedConfig) return computedConfig;
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

const parseColumnStyle = (
  styling: TableColumn["styling"],
): ColumnConfig["style"] => {
  if (styling?.type === "Barchart") {
    return {
      ...styling,
      barColor: styling.barColor ?? MINI_BARCHART_COLOR,
      textColor: styling.textColor ?? "var(--text-1)",
    };
  }
  if (styling?.type === "Scale") {
    return {
      ...styling,
      type: "Scale",
      minColor: styling.minColor ?? "#63f717",
      maxColor: styling.maxColor ?? "#46b5d5",
      textColor: styling.textColor ?? "black",
    };
  }
  if (styling?.type !== "conditional") return styling;
  return {
    type: "Conditional",
    buttonVariant: styling.buttonVariant,
    conditions: styling.conditions.map((condition) => {
      const style =
        CHIP_COLOR_NAMES[condition.chipColor] ?? CHIP_COLOR_NAMES.blue!;
      return {
        condition: condition.value,
        operator: condition.operator,
        textColor: style.textColor,
        chipColor: style.color,
        textColorDarkMode: style.textColorDarkMode,
      };
    }),
  };
};
