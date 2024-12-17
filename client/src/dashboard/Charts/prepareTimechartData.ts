import { scaleLinear } from "d3-scale";
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
        fillStyle: getCssVariableValue("--text-color-1"),
        textAlign: "center",
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
  const { layers } = this.props;
  if (!this.ref) {
    return;
  }
  if (!layers.length) {
    this.data = undefined;
    renderMessage("No active layers");
    return;
  }
  let minDate: number | null = null;
  let maxDate: number | null = null;
  let minVal: number | null = null;
  let maxVal: number | null = null;

  const dates: { x: number; v: number; date: Date }[] = [];

  const { xMin, xMax, yMin, yMax, xForYLabels } = this.getMargins();
  let tcLayers: TimeChartLayer[] = (layers as TimeChartLayer[]).map((l) => {
    const maxDataCount = 1e4;
    const data = l.data.slice(0, maxDataCount);
    if (l.data.length > data.length) {
      console.error("Too much data. slicing to " + maxDataCount);
    }

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

    filledData.forEach((d, i) => {
      (minVal ??= d.value), (maxVal ??= d.value);
      minVal = Math.min(minVal, d.value);
      maxVal = Math.max(maxVal, d.value);
    });

    l.sortedParsedData = filledData;
    return l;
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (
    minDate === null ||
    maxDate === null ||
    maxVal === null ||
    minVal === null
  ) {
    minDate ??= 0;
    maxDate ??= Date.now();
    minVal ??= 0;
    maxVal ??= 0;
    renderMessage("No Data");

    return;
  }

  const xScale = scaleLinear()
    .domain([minDate, maxDate])
    .range([xMin, xMax])
    .clamp(true);
  const xScaleYLabels = scaleLinear()
    .domain([minDate, maxDate])
    .range([xForYLabels, xMax])
    .clamp(true);
  const yScale = scaleLinear()
    .domain([maxVal, minVal])
    .range([yMin, yMax])
    .clamp(true);

  tcLayers = tcLayers.map((l) => {
    l.sortedParsedData = l.sortedParsedData?.map((d) => {
      const x = xScale(d.date);
      if (!dates.find((d) => d.v === +d.date)) {
        dates.push({ x, v: d.date, date: new Date(d.date) });
      }
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
    yScale,
    xScaleYLabels,

    minDate,
    maxDate,
    minVal,
    maxVal,
  };
};
