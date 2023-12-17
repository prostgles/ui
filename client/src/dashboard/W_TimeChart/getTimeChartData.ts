import { AnyObject, asName, isDefined } from "prostgles-types";
import { omitKeys } from "../../utils";
import { SECOND } from "../Charts";
import { DataItem, TimeChartLayer } from "../Charts/TimeChart";
import { DateExtent, MainTimeBinSizes } from "../Charts/getTimechartBinSize";
import { PALETTE, WindowData, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { W_TimeChart, ProstglesTimeChartLayer, ProstglesTimeChartState } from "./W_TimeChart";
import { TIMECHART_STAT_TYPES } from "./W_TimeChartMenu";
import { getDesiredTimeChartBinSize, getTimeChartLayersWithBins } from "./getTimeChartLayersWithBins";
import { getCellStyle } from "../W_Table/tableUtils/StyledTableColumn";
import { getColWInfo } from "../W_Table/tableUtils/getColWInfo";
import { getGroupByValueColor } from "../WindowControls/ColorByLegend";

export const getTimeLayerDataSignature = (l: ProstglesTimeChartLayer, w: WindowData<"timechart">, dependencies: any[]) => {
  if(l.type === "table"){
    return JSON.stringify({ ...omitKeys(l, ["updateOptions"]), wopts: w.options, dependencies })
  } else {
    return JSON.stringify({ ...omitKeys(l, ["updateOptions"]), wopts: w.options, dependencies })
  }
}

const FIELD_NAMES = {
  date: "date",
  value: "value"
} as const;

type TChartLayer = ProstglesTimeChartState["layers"][number];
type TChartLayers = TChartLayer[];

type Result = { 
  layers: TChartLayers;  
  error: any;
  binSize: keyof typeof MainTimeBinSizes | undefined;
};

type ExtentFilter = { filter: AnyObject; paddedEdges: [Date, Date] };
export const getExtentFilter = (
  state: ProstglesTimeChartState, 
  binSize: number | undefined
): ExtentFilter | undefined => {
  const { visibleDataExtent, viewPortExtent } = state;
  if (visibleDataExtent) {

    const { minDate, maxDate } = visibleDataExtent;
    const padd10perc = binSize? Math.max(10 * SECOND, binSize * 20) : Math.round((+maxDate - +minDate) / 10);

    /** 
     * Edges are padded to ensure edges do not show inexisting gaps 
     * Must ensure that the padding INCLUDES the bin size
    */
    const leftPadded = new Date(+minDate - padd10perc);
    const rightPadded = new Date(+maxDate + padd10perc);

    const $and: AnyObject[] = [];
    const leftEdgeVisible = viewPortExtent && visibleDataExtent.minDate >= viewPortExtent.minDate
    const rightEdgeVisible = viewPortExtent && visibleDataExtent.maxDate <= viewPortExtent.maxDate

    if(!leftEdgeVisible){
      $and.push({ [FIELD_NAMES.date]: { $gte: leftPadded } });
    }
    if(!rightEdgeVisible){
      $and.push({ [FIELD_NAMES.date]: { $lte: rightPadded } });
    }

    return {
      paddedEdges: [leftPadded, rightPadded],
      filter: { $and }
    }
  }
}

export async function getTimeChartData(this: W_TimeChart): Promise<Result | undefined> {
  
  // let xExtent: [Date, Date] | undefined;

  let layers: TChartLayers = []; 
  let bin: Result["binSize"] | undefined;

  try {

    const layerExtentBinsRes = await getTimeChartLayersWithBins.bind(this)()
    if(!layerExtentBinsRes) return undefined;

    const { db, layerExtentBins, w } = layerExtentBinsRes;
    if(!layerExtentBins.length){
      return { layers: [], error: undefined, binSize: undefined };
    }
    
    const { chartRef } = this;
    const { chart } = chartRef ?? {};
    if (!chartRef || !chart) {
      return undefined;
    }

    const min = (Math.min(...layerExtentBins.map(l => +l.request.min)));
    const max = (Math.max(...layerExtentBins.map(l => +l.request.max)));
    const dataExtent: DateExtent = {
      minDate: new Date(min),
      maxDate: new Date(max),
    };
    
    const { binSize = "auto", renderStyle = "line" } = this.d.w?.options ?? {};
    // const pxPerPoint = showBinLabels? 50 : renderStyle === "line"? 4 : renderStyle === "scatter plot"? 2 : 20;
    const pxPerPoint = renderStyle === "line"? 4 : renderStyle === "scatter plot"? 2 : 20;
    const size = chart.getWH();
    
    const binOpts = getDesiredTimeChartBinSize({ width: size.w, pxPerPoint, manualBinSize: binSize, dataExtent, viewPortExtent: this.state.viewPortExtent});
    bin = binOpts.bin;
    const { desiredBinCount } = binOpts;
    layers = (await Promise.all(
      layerExtentBins
        .map(async layer => {
          let rows: DataItem[] = [];
          let cols: TimeChartLayer["cols"] = [];
          
          const extentFilter = getExtentFilter(this.state, MainTimeBinSizes[bin!].size);
          const dataSignature = getTimeLayerDataSignature(layer, w, [extentFilter]);

          let _groupByColumn: string | undefined;
          if (layer.type === "table") {
            const { dateColumn, statType, groupByColumn, path, request } = layer;
            _groupByColumn = groupByColumn;
            const tableName = path?.length? path.at(-1)!.table : layer.tableName;

            const tableHandler = db[tableName];
            if (!tableHandler?.findOne || !tableHandler.find) {
              throw `Cannot query table ${tableName}: Missing or disallowed`;
            }

            // const cachedLayers = this.state.layers.filter(l => l.dataSignature === dataSignature);
            // extentFilter = getExtentFilter(extent, dateColumn);

            const { tableFilters } = request;
            const { select, orderBy } = getTimeChartSelectParams({ statType, groupByColumn, dateColumn, bin })

            const finalFilter = { 
              $and: [
                tableFilters, 
                extentFilter?.filter,
                { [FIELD_NAMES.date]: { "<>": null } }
              ].filter(f => f) 
            };
            rows = await tableHandler.find(
              finalFilter,
              {
                select, 
                orderBy,
                limit: (binSize !== "auto"? 1e3 : undefined) ?? 
                  (Math.max(desiredBinCount * 10, 1e4)) // Returned row count can vary considerably from the desiredBinCount
              }
            );

            /** If too zoomed in and no data then add edges */
            const firstVal = rows[0];
            const lastVal = rows.at(-1); 
            if(
              // this.state.visibleDataExtent &&
              this.state.viewPortExtent && 
              (
                !rows.length || 
                firstVal && +new Date(firstVal.date) > +(this.state.viewPortExtent.minDate) ||
                lastVal && +new Date(lastVal.date) < +(this.state.viewPortExtent.maxDate) 
              )
            ){
              const { minDate, maxDate } = this.state.viewPortExtent
              const leftValues = await tableHandler.find(
                { $and: [tableFilters, { [FIELD_NAMES.date]: { "<": minDate.toISOString() } }] },
                {
                  select, 
                  orderBy: [{ key: FIELD_NAMES.date, asc: false, nulls: "last" }],
                  limit: 2
                }
              );
              const rightValues = await tableHandler.find(
                { $and: [tableFilters, { [FIELD_NAMES.date]: { ">": maxDate.toISOString() } }] },
                {
                  select, 
                  orderBy: [{ key: FIELD_NAMES.date, asc: true, nulls: "last" }],
                  limit: 2
                }
              ); 
              rows = [...leftValues.reverse(), ...rows, ...rightValues]
            }

            rows.map(r => ({ ...r, value: +r.value }));

            const _cols = this.props.tables.find(t => t.name === tableName)?.columns;
            if (!_cols) {
              throw `Columns not found for table ${tableName}`;
            }
            cols = _cols;

          } else {
            const { dateColumn, sql, statType } = layer;

            if (!db.sql) {
              console.error("Not enough privileges to run query");
              return
            }

            let _sql = sql.trim() + "";
            if (_sql.endsWith(";")) _sql = _sql.slice(0, _sql.length - 1);
            const escDateCol = asName(dateColumn);


            // bin = bin.replace(/[0-9]/g, '');

            const plainResult = await db.sql(" SELECT * FROM (\n" + _sql + "\n ) t LIMIT 0 ");
            cols = plainResult.fields.map(f => ({ ...f, key: f.name, label: f.name, subLabel: f.dataType, udt_name: f.dataType as any }));

            let statField = "COUNT(*)"
            if (statType && statType.funcName !== "Count All") {
              const stat = TIMECHART_STAT_TYPES.find(s => s.func === statType.funcName);
              if (stat) {
                statField = `${stat.label}(${asName(statType.numericColumn)})`;
              }
            }
            const dataQuery = "SELECT date_trunc(${bin}, " + `${escDateCol}::TIMESTAMPTZ) as ${JSON.stringify(FIELD_NAMES.date)}, ${statField} as "value" \nFROM (\n` +
              _sql +
              "\n ) t \n" +
              `\nWHERE ${escDateCol} IS NOT NULL ` +
              "\nGROUP BY date_trunc(${bin}, " + escDateCol + "::TIMESTAMPTZ ) \n" +
              ` ORDER BY ${JSON.stringify(FIELD_NAMES.date)} `;


            rows = await db.sql(dataQuery, { dateColumn, bin: (bin ?? "hour").replace(/[0-9]/g, ''), statField }, { returnType: "rows" }) as any;
          }

          const renderedLayer: ProstglesTimeChartState["layers"][number] = {
            color: layer.color || "red",
            getYLabel: getYLabelFunc("", !layer.statType),
            data: rows,
            cols,
            fullExtent: [layer.request.min, layer.request.max],
            label: layer.type === "table"? layer.tableName : layer.sql.slice(0, 50),
            extFilter: extentFilter,
            dataSignature,
          }

          if(_groupByColumn){
            const { getColor } = getGroupByValueColor({ ...this.props, layerLinkId: layer.linkId, groupByColumn: _groupByColumn });
            const groupByVals = Array.from(new Set(renderedLayer.data.map(d => d[_groupByColumn!])));
            return groupByVals.map((gbVal, gbi) => {
              return {
                ...renderedLayer,
                getYLabel: getYLabelFunc(`  ${gbVal}`, !layer.statType),
                data: rows.filter(r => r[_groupByColumn!] === gbVal),
                color: getColor(gbVal, gbi),
              } satisfies TimeChartLayer
            })
          }

          return renderedLayer;
        })
      )
    
    ).filter(isDefined).flat();
  } catch (error) {
    console.error(error);
    return { error, layers: [], binSize: undefined };
  }

  return { layers, error: undefined, binSize: bin };
}
export const getTimeChartSelectDate = ({ dateColumn, bin }: Pick<GetTimeChartSelectArgs, "bin" | "dateColumn">) => {
  return { ["$date_trunc_" + bin]: [dateColumn, { timeZone: true }] };
}

type GetTimeChartSelectArgs = Pick<ProstglesTimeChartLayer, "statType" | "groupByColumn" | "dateColumn"> & {
  bin: Result["binSize"];
}
export const getTimeChartSelectParams = ({ statType, groupByColumn, dateColumn, bin }: GetTimeChartSelectArgs) => {

  let statField: any = { $countAll: [] };
  if (statType && statType.funcName !== "") {
    const stat = TIMECHART_STAT_TYPES.find(s => s.func === statType.funcName);
    if (stat) {
      statField = { [stat.func]: [statType.numericColumn] };
    }
  }

  const select = { 
    [FIELD_NAMES.value]: statField, 
    ...groupByColumn && ({ [groupByColumn]: 1 }),
    [FIELD_NAMES.date]: getTimeChartSelectDate({ bin, dateColumn })
  };

  return {
    select,
    orderBy: { [FIELD_NAMES.date]: 1 },
  } as const;
}




export const getYLabelFunc = (endText: string, asIs?: boolean): ProstglesTimeChartState["layers"][number]["getYLabel"] => {
  return ({ value, min, max }) => {
      const result = (min === max || asIs) ? `${value}` : `${value.toFixed(
      Math.max(
        2,
        /* Show enough decimal places */
        2 - Math.round(Math.log10(Math.abs(max - min)))
      )
    )}`;

    return result + endText;
  }
}

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