import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { asName } from "prostgles-types";
import type {
  DataItem,
  TimeChartLayer,
} from "../../Charts/TimeChart/TimeChart";
import type { WindowData } from "../../Dashboard/dashboardUtils";
import { getSQLQuerySemicolon } from "../../SQLEditor/SQLCompletion/completionUtils/getQueryReturnType";
import { getGroupByValueColor } from "../../WindowControls/ColorByLegend";
import type {
  ProstglesTimeChartProps,
  ProstglesTimeChartState,
  ProstglesTimeChartStateLayer,
} from "../W_TimeChart";
import { TIMECHART_STAT_TYPES } from "../W_TimeChartMenu";
import { TIMECHART_FIELD_NAMES } from "./constants";
import { getYLabelFunc, type FetchedLayerData } from "./getTimeChartData";
import { type TimeChartLayerWithBinOrError } from "./getTimeChartLayersWithBins";
import { getTimeChartSelectParams } from "./getTimeChartSelectParams";
import { getTimeLayerDataSignature } from "./getTimeLayerDataSignature";
import { getTimechartExtentFilter } from "./getTimechartExtentFilter";
import { getMainTimeBinSizes } from "src/dashboard/Charts/TimeChart/getTimechartBinSize";

type getTChartLayerArgs = Pick<
  ProstglesTimeChartState,
  "viewPortExtent" | "visibleDataExtent"
> &
  Pick<ProstglesTimeChartProps, "getLinksAndWindows" | "myLinks" | "tables"> & {
    layer: TimeChartLayerWithBinOrError;
    bin: FetchedLayerData["binSize"];
    binSize: FetchedLayerData["binSize"] | "auto";
    desiredBinCount: number;
    db: DBHandlerClient;
    w: SyncDataItem<Required<WindowData<"timechart">>, true>;
  };
export async function fetchTimechartLayer({
  bin,
  binSize,
  desiredBinCount,
  layer,
  db,
  w,
  tables,
  getLinksAndWindows,
  myLinks,
  viewPortExtent,
  visibleDataExtent,
}: getTChartLayerArgs): Promise<
  undefined | ProstglesTimeChartStateLayer | ProstglesTimeChartStateLayer[]
> {
  let rows: DataItem[] = [];
  let cols: TimeChartLayer["cols"] = [];

  const extentFilter = getTimechartExtentFilter(
    { viewPortExtent, visibleDataExtent },
    getMainTimeBinSizes()[bin!].size,
  );
  const dataSignature = getTimeLayerDataSignature(layer, w, [extentFilter]);

  if (layer.hasError) {
    throw layer.error;
  }
  const { dateColumn, statType, groupByColumn, type } = layer;
  if (layer.type === "table") {
    const { path } = layer;
    const tableName = path?.length ? path.at(-1)!.table : layer.tableName;

    const tableHandler = db[tableName];
    if (!tableHandler?.findOne || !tableHandler.find) {
      throw `Cannot query table ${tableName}: Missing or disallowed`;
    }

    // const cachedLayers = this.state.layers.filter(l => l.dataSignature === dataSignature);
    // extentFilter = getExtentFilter(extent, dateColumn);
    const { request } = layer;
    const { tableFilters } = request;
    const { select, orderBy } = getTimeChartSelectParams({
      statType,
      groupByColumn,
      dateColumn,
      bin,
    });

    const finalFilter = {
      $and: [
        tableFilters,
        extentFilter?.filter,
        { [TIMECHART_FIELD_NAMES.date]: { "<>": null } },
      ].filter((f) => f),
    };
    rows = await tableHandler.find(finalFilter, {
      select,
      orderBy,
      limit:
        (binSize !== "auto" ? 1e3 : undefined) ??
        Math.max(desiredBinCount * 10, 1e4), // Returned row count can vary considerably from the desiredBinCount
    });

    /** If too zoomed in and no data then add edges */
    const firstVal = rows[0];
    const lastVal = rows.at(-1);
    if (
      // this.state.visibleDataExtent &&
      viewPortExtent &&
      (!rows.length ||
        (firstVal && +new Date(firstVal.date) > +viewPortExtent.minDate) ||
        (lastVal && +new Date(lastVal.date) < +viewPortExtent.maxDate))
    ) {
      const { minDate, maxDate } = viewPortExtent;
      const leftValues = await tableHandler.find(
        {
          $and: [
            tableFilters,
            { [TIMECHART_FIELD_NAMES.date]: { "<": minDate.toISOString() } },
          ],
        },
        {
          select,
          orderBy: [
            { key: TIMECHART_FIELD_NAMES.date, asc: false, nulls: "last" },
          ],
          limit: 2,
        },
      );
      const rightValues = await tableHandler.find(
        {
          $and: [
            tableFilters,
            { [TIMECHART_FIELD_NAMES.date]: { ">": maxDate.toISOString() } },
          ],
        },
        {
          select,
          orderBy: [
            { key: TIMECHART_FIELD_NAMES.date, asc: true, nulls: "last" },
          ],
          limit: 2,
        },
      );
      rows = [...leftValues.reverse(), ...rows, ...rightValues];
    }

    rows.map((r) => ({ ...r, value: +r.value }));

    const _cols = tables.find((t) => t.name === tableName)?.columns;
    if (!_cols) {
      throw `Columns not found for table ${tableName}`;
    }
    cols = _cols;
  } else {
    const { dateColumn, sql, withStatement, statType, groupByColumn } = layer;

    if (!db.sql) {
      console.error("Not enough privileges to run query");
      return;
    }

    const queryWithoutSemicolon = getSQLQuerySemicolon(sql, false);
    const plainResult = await db.sql(`
        ${withStatement}
        SELECT * FROM (
          ${queryWithoutSemicolon}
        ) prostgles_chart_table 
        LIMIT 0 
      `);
    cols = plainResult.fields.map((f) => ({
      ...f,
      key: f.name,
      label: f.name,
      subLabel: f.dataType,
      udt_name: f.dataType as any,
    }));

    let statField = "COUNT(*)";
    if (statType && statType.funcName !== "$countAll") {
      const stat = TIMECHART_STAT_TYPES.find(
        (s) => s.func === statType.funcName,
      );
      if (stat) {
        statField = `${stat.label}(${asName(statType.numericColumn)})`;
      }
    }

    const binValue = bin ?? "hour";
    const binInfo = getMainTimeBinSizes()[binValue];
    const binUnit = binInfo.unit;
    const prevBinUnit = {
      millisecond: "second",
      second: "minute",
      minute: "hour",
      hour: "day",
      day: "month",
      month: "year",
      year: "year",
    }[binUnit];

    /**
     * For fractional bins we use date_bin function
     */
    const escDateCol = asName(dateColumn);
    const escGroupByCol = groupByColumn && asName(groupByColumn);
    const dateBinCol =
      binInfo.increment === 1 ?
        `date_trunc(\${bin}, ${escDateCol}::TIMESTAMPTZ)`
      : `date_bin('${binInfo.increment}${binInfo.unit}', ${escDateCol}::TIMESTAMPTZ, date_trunc('${prevBinUnit ?? binUnit}', ${escDateCol}::TIMESTAMPTZ))`;
    const topSelect = [
      `${dateBinCol} as ${JSON.stringify(TIMECHART_FIELD_NAMES.date)}`,
      escGroupByCol &&
        `${escGroupByCol} as ${JSON.stringify(TIMECHART_FIELD_NAMES.group_by)}`,
      `${statField} as ${JSON.stringify(TIMECHART_FIELD_NAMES.value)}`,
    ]
      .filter((v) => v)
      .join(", ");
    const dataQuery = [
      withStatement,
      `SELECT ${topSelect}`,
      `FROM (`,
      queryWithoutSemicolon,
      `) t `,
      `WHERE ${escDateCol} IS NOT NULL `,
      `GROUP BY 1 ${escGroupByCol ? `, 2` : ""}`,
      `ORDER BY 2`,
    ].join("\n");

    rows = (await db.sql(
      dataQuery,
      { dateColumn, bin: binInfo.unit, statField },
      { returnType: "rows" },
    )) as DataItem[];
  }

  const color = layer.color || "red";
  const renderedLayer: ProstglesTimeChartStateLayer = {
    color,
    getYLabel: getYLabelFunc("", !layer.statType),
    data: rows,
    cols,
    fullExtent: [layer.request.min, layer.request.max],
    label:
      layer.title ??
      (layer.type === "table" ? layer.tableName : layer.sql.slice(0, 50)),
    extFilter: extentFilter,
    dataSignature,
  };

  if (groupByColumn) {
    const { getColor } = getGroupByValueColor({
      getLinksAndWindows,
      myLinks,
      layerLinkId: layer.linkId,
      groupByColumn,
    });
    const groupByColumnDataKey =
      type === "table" ? groupByColumn : TIMECHART_FIELD_NAMES.group_by;
    const groupByVals = Array.from(
      new Set(renderedLayer.data.map((d) => d[groupByColumnDataKey])),
    );
    return groupByVals.map((gbVal, gbi) => {
      return {
        ...renderedLayer,
        getYLabel: getYLabelFunc(`  ${gbVal}`, !layer.statType),
        data: rows.filter((r) => r[groupByColumnDataKey] === gbVal),
        color: getColor(gbVal, gbi),
        groupByValue: gbVal,
      } satisfies TimeChartLayer;
    });
  }

  return renderedLayer;
}
