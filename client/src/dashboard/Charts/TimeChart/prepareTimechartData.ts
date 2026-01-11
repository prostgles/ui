import { scaleLinear } from "d3";
import type { TimeChart, TimeChartLayer } from "./TimeChart";
import { getCssVariableValue } from "./onRenderTimechart";

export const prepareTimechartData = function (this: TimeChart) {
  const renderMessage = (text: string) => {
    this.chart?.render([
      {
        text,
        coords: [this.ref!.offsetWidth / 2, this.ref!.offsetHeight / 2],
        id: "2111r",
        type: "text",
        fillStyle: getCssVariableValue("--text-1"),
        textAlign: "center",
        textBaseline: "middle",
        font: "18px arial",
        background: {
          fillStyle: getCssVariableValue("--bg-color-0"),
          lineWidth: 1,
          padding: 6,
          borderRadius: 3,
        },
      },
    ]);
  };

  const { w } = this.chart!.getWH();
  const { layers, yAxisScaleMode = "multiple" } = this.props;
  if (!this.ref) {
    return;
  }
  if (!layers.length) {
    this.data = undefined;
    renderMessage("No data");
    return;
  }
  let minDate = null as number | null;
  let maxDate = null as number | null;
  let minVal = null as number | null;
  let maxVal = null as number | null;

  const dates: { x: number; v: number; date: Date }[] = [];

  const { xMin, xMax, yMin, yMax, xForYLabels } = this.getMargins();
  let tcLayers: TimeChartLayer[] = layers.map((l) => {
    const maxDataCount = 1e4;
    const data = l.data.slice(0, maxDataCount);
    if (l.data.length > data.length) {
      console.error("Too much data. slicing to " + maxDataCount);
    }

    let layerMinVal: number | undefined;
    let layerMaxVal: number | undefined;

    minDate ??= +l.fullExtent[0];
    maxDate ??= +l.fullExtent[1];
    minDate = Math.min(minDate, +l.fullExtent[0]);
    maxDate = Math.max(maxDate, +l.fullExtent[1]);

    const sortedParsedData = data
      .map((d) => {
        const date = +new Date(d.date);
        const value = +d.value;
        if (isNaN(date)) {
          console.warn("timechart date is NaN");
        }
        return {
          ...d,
          date,
          value,
          x: 0,
          y: 0,
        };
      })
      .sort((a, b) => +a.date - +b.date);

    const filledData = sortedParsedData; //.slice(0, 0);
    // if(binSize){
    //   sortedParsedData.forEach((d, i)=> {

    //     let lastItem = filledData.at(-1);
    //     if(!lastItem){
    //       filledData.push(d);
    //     } else {
    //       do {
    //         filledData.push({
    //           date: lastItem!.date + binSize,
    //           value: 0,
    //           x: 0,
    //           y: 0,
    //         });
    //         lastItem = filledData.at(-1);
    //       } while(d.date - lastItem!.date > binSize);
    //       filledData.push(d);
    //     }
    //   })
    // }

    filledData.forEach((d) => {
      ((minVal ??= d.value), (maxVal ??= d.value));
      minVal = Math.min(minVal, d.value);
      maxVal = Math.max(maxVal, d.value);

      layerMinVal ??= d.value;
      layerMaxVal ??= d.value;
      layerMinVal = Math.min(layerMinVal, d.value);
      layerMaxVal = Math.max(layerMaxVal, d.value);
    });

    return {
      ...l,
      sortedParsedData: filledData,
      minVal: layerMinVal,
      maxVal: layerMaxVal,
    };
  });

  if (
    minDate === null ||
    maxDate === null ||
    maxVal === null ||
    minVal === null
  ) {
    renderMessage("No Data");

    return;
  }

  const xScale = scaleLinear()
    .domain([minDate, maxDate])
    .range([xMin, xMax])
    .clamp(false);

  const xScaleYLabels = xScale.copy().range([xForYLabels, xMax]).clamp(true);
  const getYScale = ({ maxVal, minVal }: { maxVal: number; minVal: number }) =>
    scaleLinear().domain([maxVal, minVal]).range([yMin, yMax]).clamp(false);

  tcLayers = tcLayers.map((l) => {
    l.sortedParsedData = l.sortedParsedData?.map((d) => {
      const x = xScale(d.date);
      if (!dates.find((d) => d.v === +d.date)) {
        dates.push({ x, v: d.date, date: new Date(d.date) });
      }
      const yScale =
        yAxisScaleMode === "single" ?
          getYScale({ maxVal: maxVal!, minVal: minVal! })
        : getYScale({ maxVal: l.maxVal!, minVal: l.minVal! });
      return {
        ...d,
        x,
        y: yScale(d.value),
      };
    });
    return l;
  });

  if (this.chart?.opts) {
    const deltaSecs = (+maxDate - +minDate) / 1000;

    /* Max zoom as the width of a second in pixels */
    const MAX_PX_PER_SECOND = 70;
    this.chart.opts.maxXScale = MAX_PX_PER_SECOND / (w / deltaSecs);
  }

  this.data = {
    layers: tcLayers,
    dates,
    xScale,
    getYScale: (layerIndex: number) => {
      if (yAxisScaleMode === "multiple") {
        return getYScale({
          maxVal: tcLayers[layerIndex]!.maxVal!,
          minVal: tcLayers[layerIndex]!.minVal!,
        });
      }
      return getYScale({ maxVal: maxVal!, minVal: minVal! });
    },
    xScaleYLabels,

    minDate,
    maxDate,
    minVal,
    maxVal,
  };
};
