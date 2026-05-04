import type { ChartColumn, ColInfo } from "../W_Table/TableMenu/getChartCols";
import { addLink } from "./addLink";
import { addWindow } from "./addWindow";
import type {
  DBSchemaTableWJoins,
  Link,
  NewChartOpts,
  WindowData,
} from "./dashboardUtils";
import type { DBS } from "./DBS";
import { getRandomColor } from "./PALETTE";
import {
  _PG_numbers,
  includes,
  isDefined,
  type ParsedJoinPath,
} from "prostgles-types";

export const addChart = async ({
  dbs,
  newChart,
  parentWindow,
  windows,
  myLinks,
  tables,
  existingChartWindow,
}: {
  dbs: DBS;
  newChart: {
    type: "map" | "timechart" | "barchart";
    columns: ChartColumn[];
    joinPath: ParsedJoinPath[] | undefined;
    sql: string | undefined;
    withStatement: string;
  };
  /**
   * The table OR sql window from which the chart is being added.
   */
  parentWindow: Pick<WindowData, "id" | "workspace_id" | "table_name">;
  /**
   * If the chart window already exists (because user is adding multiple charts from the same table/sql window), pass it here to avoid creating multiple chart windows for the same table/sql window.
   */
  existingChartWindow:
    | undefined
    | Pick<WindowData, "id" | "workspace_id" | "table_name">;
  windows: WindowData[];
  myLinks: Link[];
  tables: DBSchemaTableWJoins[];
}) => {
  const tableName = parentWindow.table_name ?? undefined;
  if (!tableName && !newChart.sql) {
    throw "Table name or sql is required for adding a chart";
  }
  const chartOptions = getChartLinkOptions({
    ...newChart,
    tableName,
    myLinks,
    tables,
  });
  const { name, linkOpts } = chartOptions;
  const chartType = chartOptions.linkOpts.type;
  let extra:
    | Pick<WindowData<"map">, "parent_window_id" | "options">
    | Pick<WindowData<"timechart">, "parent_window_id" | "options"> = {
    parent_window_id: null,
  };

  if (chartType === "map") {
    extra = {
      parent_window_id: parentWindow.id,
      options: {
        dataOpacity: 0.8,
        basemapOpacity: 0.25,
        basemapDesaturate: 0,
        basemapZoomOffset: 0,
        tileAttribution: {
          title: "© OpenStreetMap",
          url: "https://www.openstreetmap.org/",
        },
        aggregationMode: {
          type: "limit",
          limit: 2000,
          wait: 2,
        },
        refresh: {
          type: "Realtime",
          throttleSeconds: 1,
          intervalSeconds: 1,
        },
        showCardOnClick: true,
        showAddShapeBtn: true,
      },
    };
  } else if (chartType === "timechart") {
    extra = {
      parent_window_id: parentWindow.id,
      options: {
        showBinLabels: "off",
        binValueLabelMaxDecimals: 3,
        missingBins: "ignore",
        refresh: {
          type: "Realtime",
          throttleSeconds: 1,
          intervalSeconds: 1,
        },
      },
    };
  } else {
    extra = {
      parent_window_id: parentWindow.id,
    };
  }

  const _existingChartWindow =
    existingChartWindow ??
    windows.find(
      (cw) => cw.type === chartType && cw.parent_window_id === parentWindow.id,
    );
  const chartWindow =
    _existingChartWindow ??
    ((await addWindow(
      dbs,
      { name, type: chartType, ...extra },
      parentWindow.workspace_id,
    )) as WindowData);

  await addLink({
    dbs,
    newLink: {
      w1_id: parentWindow.id,
      w2_id: chartWindow.id,
      workspace_id: parentWindow.workspace_id,
      linkOpts,
    },
    myLinks,
  });
};

const getChartLinkOptions = ({
  type,
  columns,
  joinPath,
  tableName,
  myLinks,
  tables,
  sql,
  withStatement,
}: {
  type: "map" | "timechart" | "barchart";
  columns: ChartColumn[];
  joinPath: ParsedJoinPath[] | undefined;
  tableName: string | undefined;
  myLinks: Link[];
  tables: DBSchemaTableWJoins[];
  sql: string | undefined;
  withStatement: string;
}) => {
  const otherColumns = columns
    .reduce((a, v) => {
      v.otherColumns.forEach((vc) => {
        if (!a.some((ac) => ac.name === vc.name)) {
          a.push(vc);
        }
      });
      return a;
    }, [] as ColInfo[])
    .map(({ name, udt_name, is_pkey }) => ({ name, udt_name, is_pkey }));

  const firstNumericColumn = otherColumns.find(
    (c) => !c.is_pkey && includes(_PG_numbers, c.udt_name),
  )?.name;
  const columnList = `(${columns.map((c) => c.name).join()})`;
  const name =
    joinPath ?
      `${[tableName, ...joinPath.slice(0).map((p) => p.table)].join(" > ")} ${columnList}`
    : `${tableName || ""} ${columnList}`;
  const usedColors = myLinks
    .flatMap((l) =>
      l.options.type !== "table" ?
        l.options.columns.map((c) => c.colorArr)
      : undefined,
    )
    .filter(isDefined);
  const colorArr = getRandomColor(1, usedColors);
  const targetTable = tables.find(
    (t) => t.name === (joinPath?.at(-1)?.table ?? tableName),
  );
  const dataSource =
    sql ?
      ({
        type: "sql",
        sql,
        withStatement,
      } as const)
    : tableName ?
      ({
        type: "table",
        tableName,
        joinPath,
      } as const)
    : undefined;
  if (!dataSource) {
    throw "Table name or sql is required for table data source";
  }
  const chartOpts: NewChartOpts["linkOpts"] = {
    ...(type === "timechart" ?
      {
        type,
        otherColumns,
        columns: [
          {
            name: columns[0]!.name,
            colorArr,
            statType:
              firstNumericColumn ?
                {
                  funcName: "$avg",
                  numericColumn: firstNumericColumn,
                }
              : undefined,
          },
        ],
      }
    : type === "barchart" ?
      {
        type: "barchart",
        statType:
          firstNumericColumn ?
            {
              funcName: "$sum",
              numericColumn: firstNumericColumn,
            }
          : undefined,
        columns: columns.map(({ name }) => ({
          name,
          colorArr,
        })),
      }
    : {
        type,
        columns: columns.map(({ name }) => ({
          name,
          colorArr,
        })),
        mapIcons:
          !targetTable?.icon ?
            undefined
          : {
              type: "fixed",
              iconPath: targetTable.icon,
              display: "icon+circle",
            },
      }),
    dataSource,
  };

  return {
    name,
    linkOpts: chartOpts,
  } satisfies NewChartOpts;
};
