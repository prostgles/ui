import type { DataItem, TimeChart, TimeChartLayer } from "./TimeChart";

type IntersectedLayers = {
  layers: (TimeChartLayer & { y: number; snapped_data?: DataItem })[];
  snapped_x?: number;
};

export const getTimechartTooltipIntersections = function (
  this: TimeChart,
  xCanvas: number,
): IntersectedLayers | undefined {
  let snapped_x;

  if (!this.chart) return undefined;

  const [xPoint] = this.chart.getDataXY(xCanvas, 0);

  const layers: IntersectedLayers["layers"] = [];
  const { renderStyle = "line" } = this.props;
  const SNAP_DISTANCE =
    this.lineLayers?.some((layer) => layer.coords.length < 3) ? 10 : 5;
  this.lineLayers?.forEach((layer) => {
    layer.coords.find((coord, i) => {
      const x = coord[0];

      /**
       * Y value starts with 0 at the top
       */
      const y = coord[1];

      if (layer.coords.length === 1 || i < layer.coords.length - 1) {
        const nextPoint = layer.coords[i + 1];

        if (!this.chart) return undefined;

        const [xS] = this.chart.getScreenXY(x);
        const xDist = Math.abs(xCanvas - xS);

        /* Snapped point to line joints */
        if (xDist <= SNAP_DISTANCE) {
          snapped_x = x;

          layers.push({
            ...layer,
            y,
            snapped_data: layer.data[i],
          });
          return true;
        } else if (nextPoint !== undefined) {
          const [xNext, yNext] = nextPoint;
          const [xNS] = this.chart.getScreenXY(xNext);
          const xNextDist = Math.abs(xCanvas - xNS);

          if (xNextDist <= SNAP_DISTANCE) {
            snapped_x = xNext;
            const layerSnapData = {
              ...layer,
              y: yNext,
              snapped_data: layer.data[i + 1],
            };
            layers.push(layerSnapData);
            return true;

            /* Point along line */
          } else if (
            renderStyle === "line" &&
            ((xPoint >= x && xPoint < xNext) || (xPoint >= xNext && xPoint < x))
          ) {
            const xDiff = xNext - x,
              yDiff = yNext - y,
              perc = (xPoint - x) / xDiff;
            const layerIntersectionData = {
              ...layer,
              y: y + perc * yDiff,
            };
            layers.push(layerIntersectionData);
            return true;
          }
        }
      }
      return false;
    });
  });

  return { layers, snapped_x };
};
