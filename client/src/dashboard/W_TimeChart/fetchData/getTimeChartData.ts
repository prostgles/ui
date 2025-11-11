import { isDefined, tryCatchV2 } from "prostgles-types";
import type {
  DateExtent,
  getMainTimeBinSizes,
} from "../../Charts/getTimechartBinSize";
import type {
  ProstglesTimeChartState,
  ProstglesTimeChartStateLayer,
  W_TimeChart,
} from "../W_TimeChart";
import { fetchTimechartLayer } from "./fetchTimechartLayer";
import {
  getDesiredTimeChartBinSize,
  getTimeChartLayersWithBins,
  type TimeChartLayerWithBin,
  type TimeChartLayerWithBinOrError,
} from "./getTimeChartLayersWithBins";

type TChartLayer = ProstglesTimeChartState["layers"][number];
type TChartLayers = TChartLayer[];

export type FetchedLayerData = {
  layers: TChartLayers;
  erroredLayers: TimeChartLayerWithBinOrError[];
  error: any;
  binSize: keyof ReturnType<typeof getMainTimeBinSizes> | undefined;
};

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
          const {
            data: fetchedLayer,
            hasError,
            error,
          } = await tryCatchV2(async () => {
            const fetchedLayer = await fetchTimechartLayer({
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
            return fetchedLayer;
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

/**
 * Given the y-axis value range, format the number for best comprehension
 */
export const getYLabelFunc = (
  endText: string,
  asIs?: boolean,
): ProstglesTimeChartStateLayer["getYLabel"] => {
  return ({ value, min, max }) => {
    const result =
      Math.abs(min - max) > 1 || min === max || asIs ?
        `${value.toLocaleString()}`
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
