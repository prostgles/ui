import type { AnyObject } from "prostgles-types";
import { SECOND } from "../../Charts";
import type { W_TimeChartState } from "../W_TimeChart";
import { TIMECHART_FIELD_NAMES } from "./constants";

export type TimechartExtentFilter = {
  filter: AnyObject;
  paddedEdges: [Date, Date];
};

export const getTimechartExtentFilter = (
  state: Pick<W_TimeChartState, "viewPortExtent" | "visibleDataExtent">,
  binSize: number | undefined,
): TimechartExtentFilter | undefined => {
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
      $and.push({ [TIMECHART_FIELD_NAMES.date]: { $gte: leftPadded } });
    }
    if (!rightEdgeVisible) {
      $and.push({ [TIMECHART_FIELD_NAMES.date]: { $lte: rightPadded } });
    }

    return {
      paddedEdges: [leftPadded, rightPadded],
      filter: { $and },
    };
  }
};
