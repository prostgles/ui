import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { tryCatch } from "prostgles-types";
import type { AnyObject} from "prostgles-types";
import { asName } from "prostgles-types";
import { isDefined } from "../../utils";
import type { DateExtent} from "../Charts/getTimechartBinSize";
import { getTimechartBinSize } from "../Charts/getTimechartBinSize";
import type { WindowData, WindowSyncItem } from "../Dashboard/dashboardUtils";
import type { ProstglesTimeChartLayer, W_TimeChart } from "./W_TimeChart";
import type { TimeChartBinSize } from "./W_TimeChartMenu";
import { getExtentFilter, getTimeLayerDataSignature } from "./getTimeChartData";

export const getTimeChartFilters = (w: WindowData<"timechart"> | WindowSyncItem<"timechart">, dateColumn: string) => {
  return w.options?.filter? [
    { [dateColumn]: { ">": new Date(w.options.filter.min) } },
    { [dateColumn]: { "<": new Date(w.options.filter.max) } }
  ] : [];
}

export type TimeChartLayerWithBin = (ProstglesTimeChartLayer & {
  request: {
    min: Date; 
    max: Date; 
    dateExtent: number;
    finalFilter: AnyObject;
    dataSignature: string; 
    tableFilters: AnyObject;
  }
});

async function getTimeChartLayerWithBin(this: W_TimeChart, layer: ProstglesTimeChartLayer){
  const { prgl: { db } } = this.props;
  const { w } = this.d;
  if(!w) return undefined;

  const extentFilter = getExtentFilter(this.state, undefined);
  const dataSignature = getTimeLayerDataSignature(layer, w, [extentFilter]);
  const layerSubscription = this.layerSubscriptions[layer._id];
  if(layerSubscription) layerSubscription.isLoading = true;
  if (layer.type === "table") {
    const { dateColumn, externalFilters, tableFilter, path } = layer;
    const tableName = path?.length? path.at(-1)!.table : layer.tableName;

    const tableHandler = db[tableName];
    if (!tableHandler?.findOne || !tableHandler.find) {
      throw `Cannot query table ${tableName}: Missing or disallowed`;
    }

    // TODO low priority: Cache layers when panning
    // const cachedLayers = this.state.layers.filter(l => l.dataSignature === dataSignature);
    // extentFilter = getExtentFilter(extent, dateColumn);

    /** Subscribe */
    const strFilter = JSON.stringify(externalFilters);
    const timeChartFilters = getTimeChartFilters(w, dateColumn)
    const tableFilters = { $and: [...externalFilters, ...timeChartFilters, tableFilter].filter(isDefined) };
    const existingSubscription = this.layerSubscriptions[layer._id];
    if (tableHandler.subscribe && (!existingSubscription || existingSubscription.filterStr !== strFilter)) {
      await existingSubscription?.sub.unsubscribe();
      const firstDataAge = Date.now();
      this.layerSubscriptions[layer._id] = {
        filterStr: strFilter,
        sub: await tableHandler.subscribe(tableFilters, { select: "", limit: 0, throttle: 500 }, () => {
          
          const now = Date.now();
          const prevAge = this.layerSubscriptions[layer._id]?.latestDataAge;
          this.layerSubscriptions[layer._id]!.latestDataAge = now;

          // Skip first
          if(prevAge === firstDataAge){
            return
          }

          // Skip when already fetching. Will re-fetch when done
          if(this.layerSubscriptions[layer._id]?.isLoading){
            return
          }

          this.setDataAge(now)
          
        }),
        dataAge: firstDataAge,
        latestDataAge: firstDataAge,
        isLoading: true,
      }
    }

    /* Get date delta to work out bin size */
    const finalFilter = { $and: [tableFilters, extentFilter?.filter].filter(f => f) };
    const dateRange = await getTimeChartMinMax(tableHandler, tableFilters, dateColumn);
    const res: TimeChartLayerWithBin = {
      ...layer,
      request: {
        dataSignature, 
        tableFilters,
        finalFilter, 
        ...dateRange,
        // limit: optsBinSize ? 1000 : undefined,
      }
    }
    return res;

  } else {
    const { dateColumn, sql } = layer;

    if (!db.sql) {
      console.error("Not enough privileges to run query");
      return
    }

    // const extentFilter = "";
    // let bin: { key: typeof optsBinSize, size: number; } | undefined = !optsBinSize? undefined : { ...MainTimeBinSizes[optsBinSize], key: optsBinSize };
    // if(extent){
    //   const { leftDate, rightDate } = extent;
    //   if(leftDate && rightDate) {
    //     extentFilter = await db.sql(
    //       " WHERE ${dateColumn:name} >= ${leftDate} AND ${dateColumn:name} <= ${leftDate}  ", 
    //       { dateColumn, leftDate, rightDate }, 
    //       { returnType: "statement" }
    //     );
    //     bin = this.getBin(leftDate, rightDate);
    //   }
    // }

    let _sql = sql.trim() + "";
    if (_sql.endsWith(";")) _sql = _sql.slice(0, _sql.length - 1);
    const escDateCol = asName(dateColumn);

    
    const minMaxQuery = `SELECT MIN(${escDateCol}) as min, MAX(${escDateCol}) as max FROM (\n` + _sql + "\n ) t";
    const rows = (await db.sql(minMaxQuery, { dateColumn }, { returnType: "rows" }));
    if (!rows.length) {
      console.warn("No min max");
    }
    const minMaxDateStr = rows[0] ?? {};
      // const bin = optsBinSize ?? getTimechartBinSize({ minDate: new Date(min), maxDate: new Date(max)}, extent, bin_count).key;
    const min = new Date(minMaxDateStr.min);
    const max = new Date(minMaxDateStr.max);

    const res: TimeChartLayerWithBin = {
      ...layer,
      request: {
        tableFilters: {},
        dataSignature, 
        finalFilter: extentFilter ?? {}, 
        max, min,  
        dateExtent: +max - +min,
      }
    }
    return res;

  }
}

export async function getTimeChartLayersWithBins (this: W_TimeChart){

  const { w } = this.d;
  if (!w) {
    return undefined;
  }

  const activeLayers = this.layerQueries
    .filter(l => !l.disabled);

  let layerExtentBins: TimeChartLayerWithBin[]  = [];


  layerExtentBins = (await Promise.all(
    activeLayers
      .map(async layer => {
        const { layerWithBin, duration, hasError } = await tryCatch(async () => {
          const layerWithBin = await getTimeChartLayerWithBin.bind(this)(layer);
          return { layerWithBin }
        });
        const layerSubscription = this.layerSubscriptions[layer._id];
        if(hasError && layerSubscription){
          layerSubscription.isLoading = false;
        }
        return hasError? undefined : layerWithBin;
      })
    )

  ).filter(isDefined).flat();

  return { layerExtentBins }
}


type GetDesiredTimeChartBinSizeArgs = {
  width: number;
  pxPerPoint: number;
  manualBinSize: TimeChartBinSize | undefined;
  dataExtent: DateExtent;
  viewPortExtent: DateExtent | undefined;
}
export const getDesiredTimeChartBinSize = ({ width, pxPerPoint, manualBinSize, dataExtent, viewPortExtent }: GetDesiredTimeChartBinSizeArgs) => {

  const desiredBinCount = Math.round(width/pxPerPoint);

  const bin = manualBinSize && manualBinSize !== "auto"? manualBinSize : 
    getTimechartBinSize({ data: dataExtent, viewPort: viewPortExtent, bin_count: desiredBinCount }).key;
  return { bin, desiredBinCount };
}

export const getTimeChartMinMax = async (tableHandler: TableHandlerClient | Partial<TableHandlerClient<AnyObject, void>>, tableFilters, dateColumn: string) => {

  const minMax = await tableHandler.findOne!(
    tableFilters,
    { select: { min: { $min: [dateColumn] }, max: { $max: [dateColumn] } } }
  ).catch(console.error) as { min: string; max: string };

  const min = new Date(minMax.min);
  const max = new Date(minMax.max);
  const dateExtent = +max - +min;

  return {
    min, max, dateExtent
  }
}