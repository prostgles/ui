import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import { asName, isDefined, tryCatch } from "prostgles-types";
import { omitKeys } from "prostgles-types";
import { SECOND } from "../Charts";
import type { DataItem, TimeChartLayer } from "../Charts/TimeChart";
import type { DateExtent } from "../Charts/getTimechartBinSize";
import { getMainTimeBinSizes } from "../Charts/getTimechartBinSize";
import type { WindowData } from "../Dashboard/dashboardUtils";
import { getGroupByValueColor } from "../WindowControls/ColorByLegend";
import type {
  ProstglesTimeChartLayer,
  ProstglesTimeChartProps,
  ProstglesTimeChartState,
  ProstglesTimeChartStateLayer,
  W_TimeChart,
} from "./W_TimeChart";
import { TIMECHART_STAT_TYPES } from "./W_TimeChartMenu";
import {
  getDesiredTimeChartBinSize,
  getTimeChartLayersWithBins,
  type TimeChartLayerWithBin,
  type TimeChartLayerWithBinOrError,
} from "./getTimeChartLayersWithBins";

export const getTimeLayerDataSignature = (
  l: ProstglesTimeChartLayer,
  w: WindowData<"timechart">,
  dependencies: any[],
) => {
  if (l.type === "table") {
    return JSON.stringify({
      ...omitKeys(l, ["updateOptions"]),
      wopts: w.options,
      dependencies,
    });
  } else {
    return JSON.stringify({
      ...omitKeys(l, ["updateOptions"]),
      wopts: w.options,
      dependencies,
    });
  }
};

const FIELD_NAMES = {
  date: "date",
  value: "value",
  group_by: "group_by",
} as const;

type TChartLayer = ProstglesTimeChartState["layers"][number];
type TChartLayers = TChartLayer[];

type FetchedLayerData = {
  layers: TChartLayers;
  erroredLayers: TimeChartLayerWithBinOrError[];
  error: any;
  binSize: keyof ReturnType<typeof getMainTimeBinSizes> | undefined;
};

type ExtentFilter = { filter: AnyObject; paddedEdges: [Date, Date] };
export const getExtentFilter = (
  state: Pick<ProstglesTimeChartState, "viewPortExtent" | "visibleDataExtent">,
  binSize: number | undefined,
): ExtentFilter | undefined => {
  const { visibleDataExtent, viewPortExtent } = state;
  if (visibleDataExtent) {
    const { minDate, maxDate } = visibleDataExtent;
    const padd10perc =
      binSize ?
        Math.max(10 * SECOND, binSize * 20)
      : Math.round((+maxDate - +minDate) / 10);

    /**
     * Edges are padded to ensure edges do not show inexisting gaps
     * Must ensure that the padding INCLUDES the bin size
     */
    const leftPadded = new Date(+minDate - padd10perc);
    const rightPadded = new Date(+maxDate + padd10perc);

    const $and: AnyObject[] = [];
    const leftEdgeVisible =
      viewPortExtent && visibleDataExtent.minDate >= viewPortExtent.minDate;
    const rightEdgeVisible =
      viewPortExtent && visibleDataExtent.maxDate <= viewPortExtent.maxDate;

    if (!leftEdgeVisible) {
      $and.push({ [FIELD_NAMES.date]: { $gte: leftPadded } });
    }
    if (!rightEdgeVisible) {
      $and.push({ [FIELD_NAMES.date]: { $lte: rightPadded } });
    }

    return {
      paddedEdges: [leftPadded, rightPadded],
      filter: { $and },
    };
  }
};

type getTChartLayerArgs = Pick<
  ProstglesTimeChartState,
  "viewPortExtent" | "visibleDataExtent"
> &
  Pick<ProstglesTimeChartProps, "getLinksAndWindows" | "myLinks" | "tables"> & {
    layer: TimeChartLayerWithBinOrError;
    bin: FetchedLayerData["binSize"] | undefined;
    binSize: FetchedLayerData["binSize"] | "auto";
    desiredBinCount: number;
    db: DBHandlerClient;
    w: SyncDataItem<Required<WindowData<"timechart">>, true>;
  };
async function getTChartLayer({
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

  const extentFilter = getExtentFilter(
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
        { [FIELD_NAMES.date]: { "<>": null } },
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
            { [FIELD_NAMES.date]: { "<": minDate.toISOString() } },
          ],
        },
        {
          select,
          orderBy: [{ key: FIELD_NAMES.date, asc: false, nulls: "last" }],
          limit: 2,
        },
      );
      const rightValues = await tableHandler.find(
        {
          $and: [
            tableFilters,
            { [FIELD_NAMES.date]: { ">": maxDate.toISOString() } },
          ],
        },
        {
          select,
          orderBy: [{ key: FIELD_NAMES.date, asc: true, nulls: "last" }],
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

    const plainResult = await db.sql(`
        ${withStatement}
        SELECT * FROM (
          ${sql}
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
      `${dateBinCol} as ${JSON.stringify(FIELD_NAMES.date)}`,
      escGroupByCol &&
        `${escGroupByCol} as ${JSON.stringify(FIELD_NAMES.group_by)}`,
      `${statField} as ${JSON.stringify(FIELD_NAMES.value)}`,
    ]
      .filter((v) => v)
      .join(", ");
    const dataQuery = [
      withStatement,
      `SELECT ${topSelect}`,
      `FROM (`,
      sql,
      `) t `,
      `WHERE ${escDateCol} IS NOT NULL `,
      `GROUP BY 1 ${escGroupByCol ? `, 2` : ""}`,
      `ORDER BY 2`,
    ].join("\n");

    rows = (await db.sql(
      dataQuery,
      { dateColumn, bin: binInfo.unit, statField },
      { returnType: "rows" },
    )) as any;
  }

  const renderedLayer: ProstglesTimeChartState["layers"][number] = {
    color: layer.color || "red",
    getYLabel: getYLabelFunc("", !layer.statType),
    data: rows,
    cols,
    fullExtent: [layer.request.min, layer.request.max],
    label: layer.type === "table" ? layer.tableName : layer.sql.slice(0, 50),
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
      type === "table" ? groupByColumn : FIELD_NAMES.group_by;
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

export async function getTimeChartData(
  this: W_TimeChart,
): Promise<FetchedLayerData | undefined> {
  let layers: TChartLayers = [];
  let bin: FetchedLayerData["binSize"] | undefined;
  let erroredLayers: TimeChartLayerWithBinOrError[] = [];
  try {
    const {
      prgl: { db },
    } = this.props;
    const { w } = this.d;
    if (!w) {
      return undefined;
    }
    const layerExtentBinsRes = await getTimeChartLayersWithBins.bind(this)();
    if (!layerExtentBinsRes) return undefined;

    const { layerExtentBins } = layerExtentBinsRes;
    const nonErroredLayers = layerExtentBins.filter(
      (l): l is TimeChartLayerWithBin => !l.hasError,
    );
    erroredLayers = layerExtentBins.filter((l) => l.hasError);
    if (!layerExtentBins.length) {
      return {
        layers: [],
        erroredLayers,
        error: undefined,
        binSize: undefined,
      };
    }

    const { chartRef } = this;
    const { chart } = chartRef ?? {};
    if (!chartRef || !chart) {
      return undefined;
    }

    const min = Math.min(...nonErroredLayers.map((l) => +l.request.min));
    const max = Math.max(...nonErroredLayers.map((l) => +l.request.max));
    const dataExtent: DateExtent = {
      minDate: new Date(min),
      maxDate: new Date(max),
    };

    const { binSize = "auto", renderStyle = "line" } = this.d.w?.options ?? {};
    // const pxPerPoint = showBinLabels? 50 : renderStyle === "line"? 4 : renderStyle === "scatter plot"? 2 : 20;
    const pxPerPoint =
      renderStyle === "line" ? 4
      : renderStyle === "scatter plot" ? 2
      : 20;
    const size = chart.getWH();
    const { getLinksAndWindows, myLinks, tables } = this.props;
    const { viewPortExtent, visibleDataExtent } = this.state;
    const binOpts = getDesiredTimeChartBinSize({
      width: size.w,
      pxPerPoint,
      manualBinSize: binSize,
      dataExtent,
      viewPortExtent: this.state.viewPortExtent,
    });
    bin = binOpts.bin;
    const { desiredBinCount } = binOpts;
    layers = (
      await Promise.all(
        nonErroredLayers.map(async (layer) => {
          const { fetchedLayer, hasError, error } = await tryCatch(async () => {
            const fetchedLayer = await getTChartLayer({
              getLinksAndWindows,
              myLinks,
              tables,
              viewPortExtent,
              visibleDataExtent,
              layer,
              bin,
              binSize,
              db,
              w,
              desiredBinCount,
            });
            return { fetchedLayer };
          });
          const layerSubscription = this.layerSubscriptions[layer._id];
          if (layerSubscription) {
            layerSubscription.isLoading = false;
          }
          if (hasError && !erroredLayers.some((el) => el._id === layer._id)) {
            erroredLayers.push({
              ...layer,
              hasError,
              error,
              request: undefined,
            });
          }

          return hasError ? undefined : fetchedLayer;
        }),
      )
    )
      .filter(isDefined)
      .flat();
  } catch (error) {
    console.error(error);
    return { error, erroredLayers, layers: [], binSize: undefined };
  }

  return { layers, erroredLayers, error: undefined, binSize: bin };
}
export const getTimeChartSelectDate = ({
  dateColumn,
  bin,
}: Pick<GetTimeChartSelectArgs, "bin" | "dateColumn">) => {
  return { ["$date_trunc_" + bin]: [dateColumn, { timeZone: true }] };
};

type GetTimeChartSelectArgs = Pick<
  ProstglesTimeChartLayer,
  "statType" | "groupByColumn" | "dateColumn"
> & {
  bin: FetchedLayerData["binSize"];
};
export const getTimeChartSelectParams = ({
  statType,
  groupByColumn,
  dateColumn,
  bin,
}: GetTimeChartSelectArgs) => {
  let statField: any = { $countAll: [] };
  if (statType) {
    const stat = TIMECHART_STAT_TYPES.find((s) => s.func === statType.funcName);
    if (stat) {
      statField = { [stat.func]: [statType.numericColumn] };
    }
  }

  const select = {
    [FIELD_NAMES.value]: statField,
    ...(groupByColumn && { [groupByColumn]: 1 }),
    [FIELD_NAMES.date]: getTimeChartSelectDate({ bin, dateColumn }),
  };

  return {
    select,
    orderBy: { [FIELD_NAMES.date]: 1 },
  } as const;
};

export const getYLabelFunc = (
  endText: string,
  asIs?: boolean,
): ProstglesTimeChartState["layers"][number]["getYLabel"] => {
  return ({ value, min, max }) => {
    const result =
      min === max || asIs ?
        `${value}`
      : `${value.toFixed(
          Math.max(
            2,
            /* Show enough decimal places */
            2 - Math.round(Math.log10(Math.abs(max - min))),
          ),
        )}`;

    return result + endText;
  };
};

// console.log(this.state.visibleDataExtent);
// console.log({rows}, await tableHandler.find(finalFilter, { select: { [dateColumn]: 1 } }))
/**
 * Ensure we add outside edges when zoomed in
 */
// if (extentFilter) {
//   const left = rows[0];
//   const right = rows[rows.length - 1];

//   if (!left || +left.value >= +extentFilter.paddedEdges[0]) {
//     const leftOutsidePoint = await tableHandler.findOne(tableFilters, { select, orderBy: { date: -1 } });
//     if (leftOutsidePoint) {
//       rows = [
//         leftOutsidePoint,
//         ...rows
//       ]
//     }
//   }
//   if (!right || +right.value <= +extentFilter.paddedEdges[1]) {
//     const rightOutsidePoint = await tableHandler.findOne(tableFilters, { select, orderBy: { date: 1 } });
//     if (rightOutsidePoint) {
//       rows = [
//         ...rows,
//         rightOutsidePoint
//       ]
//     }
//   }
// }
