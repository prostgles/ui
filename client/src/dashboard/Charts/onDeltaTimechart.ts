import { CanvasChart } from "../Charts/CanvasChart";
import type { DeepPartial } from "../RTComp";
import type { TimeChart, TimeChartD, TimeChartProps } from "./TimeChart";
import { onRenderTimechart } from "./onRenderTimechart";

export const onDeltaTimechart = function (
  this: TimeChart,
  dp?: Partial<TimeChartProps>,
  ds?: never,
  dd?: DeepPartial<TimeChartD>,
) {
  const delta = { ...dp, ...dd };
  /** Chart cannot be reinstantiated because old handlers are not destroyed */
  if (this.ref && this.canv && !this.chart) {
    const { onExtentChanged, chartRef, zoomPanDisabled } = this.props;

    this.chart = new CanvasChart({
      node: this.ref,
      canvas: this.canv,
      yScaleLocked: true,
      yPanLocked: true,
      minXScale: 1,
      onResize: () => {
        this.parseData();
        this.onDelta({ layers: this.props.layers });
      },
      events:
        zoomPanDisabled ?
          { disabled: true }
        : {
            onExtentChange: () => {
              this.lastExtentChange = Date.now();
            },
            onExtentChanged: (extent) => {
              if (onExtentChanged && this.data && this.chart) {
                const resetExtent =
                  [extent.xScale, extent.yScale].every((v) => v < 1.0001) &&
                  [extent.leftX, extent.topY].every(
                    (v) => Math.abs(v) < 0.0000001,
                  );
                const viewPortExtent = this.getVisibleExtent();
                if (viewPortExtent) {
                  const visibleData = {
                    minDate: new Date(this.data.xScale.invert(extent.leftX)),
                    maxDate: new Date(this.data.xScale.invert(extent.rightX)),
                  };
                  onExtentChanged(visibleData, viewPortExtent, { resetExtent });
                }
              }
              this.setData({ extent });
            },
            onPan: () => {
              this.panning = true;
            },
            onPanEnd: () => {
              this.panning = false;
            },
          },
    });

    chartRef?.(this);
  }

  onRenderTimechart.bind(this)(delta, dd);
};
