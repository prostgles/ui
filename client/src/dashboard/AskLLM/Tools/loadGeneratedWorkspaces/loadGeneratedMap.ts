import type { MapWindowInsertModel } from "@common/DashboardTypes";
import type { LinkOption, WindowInsertModel } from "./loadGeneratedWorkspaces";
import { getRGBColor } from "src/dashboard/W_Table/ColumnMenu/ColorPicker";

export const loadGeneratedMap = (
  generatedWindow: MapWindowInsertModel,
): { window: WindowInsertModel; linkOptions: LinkOption[] } => {
  const { title, layers } = generatedWindow;

  const tableLayer = layers.find(
    (l): l is Exclude<typeof l, { sql: string }> => "table_name" in l,
  );
  const window: WindowInsertModel = {
    type: "map",
    title,
    table_name: tableLayer?.table_name || "",
  };

  const linkOptions: LinkOption[] = layers.map((l, i) => {
    const columns = [
      {
        name: l.geoColumn,
        colorArr: [...getRGBColor(i), 0.8],
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
        console.warn("Map with quickFilterGroups is not supported yet");
      }
      return {
        type: "map",
        columns: columns,
        dataSource: {
          type: "local-table",
          localTableName: table_name,
          smartGroupFilter,
        },
      } satisfies LinkOption;
    }

    return {
      type: "map",
      columns,
      dataSource: { type: "sql", sql: l.sql, withStatement: "" },
    } satisfies LinkOption;
  });
  return {
    window,
    linkOptions,
  };
};
