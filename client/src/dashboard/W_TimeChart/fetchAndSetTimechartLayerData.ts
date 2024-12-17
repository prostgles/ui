import { MILLISECOND } from "../Charts";
import { getMainTimeBinSizes } from "../Charts/getTimechartBinSize";
import { getTimeChartData } from "./getTimeChartData";
import type { W_TimeChart } from "./W_TimeChart";

export const fetchAndSetTimechartLayerData = async function (
  this: W_TimeChart,
) {
  this.setState({ loadingData: true });
  try {
    const timechartData = await getTimeChartData.bind(this)();
    if (timechartData) {
      const { error, layers: rawLayers, erroredLayers } = timechartData;
      const binSize =
        timechartData.binSize ?
          getMainTimeBinSizes()[timechartData.binSize].size
        : undefined;
      const layers = rawLayers.map((l) => {
        const sortedParsedData = l.data
          .map((d) => {
            return {
              ...d,
              value: +d.value,
              date: +new Date(d.date),
            };
          })
          .sort((a, b) => a.date - b.date);

        /** Add empty bins */
        let filledData = sortedParsedData.slice(0, 0);
        const { missingBins = "ignore", renderStyle = "line" } =
          this.d.w?.options ?? {};
        if (binSize) {
          if (missingBins === "ignore" || renderStyle !== "line") {
            filledData = sortedParsedData.slice(0);
          } else if (missingBins === "show nearest") {
            filledData = sortedParsedData.slice(0);
            for (let i = sortedParsedData.length - 1; i >= 0; i--) {
              const d = sortedParsedData[i];
              const nextD = sortedParsedData[i + 1];

              if (d && nextD) {
                const gapSize = nextD.date - d.date;
                const gapSizeInBins = Math.floor(gapSize / binSize);
                const halfGapSizeInBins = Math.floor(gapSizeInBins / 2);
                if (gapSize > binSize + MILLISECOND) {
                  filledData.splice(i + 1, 0, {
                    value: nextD.value,
                    date: nextD.date - halfGapSizeInBins * binSize,
                  });
                  /** If not exactly in the middle then also add the left point */
                  if (gapSizeInBins % 2 !== 0) {
                    const leftGapSizeInBins = Math.floor(gapSizeInBins / 2);
                    filledData.splice(i, 0, {
                      value: d.value,
                      date: d.date + leftGapSizeInBins * binSize,
                    });
                  }
                }
              }
            }
          } else {
            sortedParsedData.forEach((d) => {
              let preLastItem = filledData.at(-2);
              let lastItem = filledData.at(-1);
              if (!lastItem) {
                filledData.push(d);
              } else {
                while (d.date - lastItem!.date > binSize + MILLISECOND) {
                  const emptyItem = {
                    value: 0,
                    date: lastItem!.date + binSize,
                  };
                  /** Update last point if drawing a straigh line to avoid too many points */
                  if (
                    lastItem &&
                    preLastItem &&
                    Number(preLastItem.value) === 0 &&
                    Number(lastItem.value) === 0
                  ) {
                    lastItem.date = emptyItem.date;
                  } else {
                    filledData.push(emptyItem);
                  }
                  preLastItem = filledData.at(-2);
                  lastItem = filledData.at(-1);
                }
                filledData.push(d);
              }
            });
          }
        }

        if (this.ref && this.chartRef) {
          setTimeout(() => {
            const renderedData = filledData.map((d) => {
              const [x, y] =
                this.chartRef!.getPointXY({
                  date: new Date(d.date),
                  value: +d.value,
                }) ?? [];
              return {
                x,
                y,
                value: d.value,
              };
            });
            (this.ref as any)._renderedData = renderedData;
          }, 0);
        }

        return {
          ...l,
          data: filledData,
        };
      });

      this.setState({
        loadingData: false,
        loading: false,
        binSize: timechartData.binSize,
        error,
        layers,
        erroredLayers,
      });
    }
  } catch (error) {
    this.setState({ loading: false, error, loadingData: false });
  }
};
