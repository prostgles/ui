import type { TimechartWindowInsertModel } from "@common/DashboardTypes";
import { getPaletteRGBColor } from "src/dashboard/W_Table/ColumnMenu/ColorPicker";
import type { LinkOption, WindowInsertModel } from "./loadGeneratedWorkspaces";

export const loadGeneratedTimechart = (
  generatedWindow: TimechartWindowInsertModel,
): { window: WindowInsertModel; linkOptions: LinkOption[] } => {
  const { title, layers } = generatedWindow;

  const tableLayer = layers.find(
    (l): l is Exclude<typeof l, { sql: string }> => "table_name" in l,
  );
  const window: WindowInsertModel = {
    type: "timechart",
    title,
    table_name: tableLayer?.table_name || "",
  };

  const linkOptions: LinkOption[] = layers.map((l, i) => {
    const columns = [
      {
        name: l.dateColumn,
        statType:
          l.yAxis === "count(*)" ?
            undefined
          : {
              funcName: `$${l.yAxis.aggregation}` as any,
              numericColumn: l.yAxis.column,
            },

        colorArr: [...getPaletteRGBColor(i), 255],
      },
    ];
    if ("table_name" in l) {
      const { filter, table_name, filterOperand, quickFilterGroups } = l;
      const smartGroupFilter =
        filter ?
          filterOperand === "OR" ?
            { $or: filter }
          : { $and: filter }
        : undefined;
      if (quickFilterGroups) {
        console.warn("quickFilterGroups is not supported yet");
      }
      return {
        type: "timechart",
        columns,
        title: l.title,
        groupByColumn: l.groupByColumn,
        dataSource: {
          type: "local-table",
          localTableName: table_name,
          smartGroupFilter,
        },
      } satisfies LinkOption;
    }

    return {
      type: "timechart",
      columns,
      title: l.title,
      groupByColumn: l.groupByColumn,
      dataSource: { type: "sql", sql: l.sql, withStatement: "" },
    } satisfies LinkOption;
  });
  return {
    window,
    linkOptions,
  };
};
