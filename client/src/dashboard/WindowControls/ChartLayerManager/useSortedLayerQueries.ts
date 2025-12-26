import { isDefined } from "prostgles-types";
import type { LinkSyncItem } from "src/dashboard/Dashboard/dashboardUtils";
import type { LayerQuery } from "src/dashboard/W_Map/W_Map";
import type { ProstglesTimeChartLayer } from "src/dashboard/W_TimeChart/W_TimeChart";

type Args<T extends ProstglesTimeChartLayer | LayerQuery> = {
  layerQueries: T[];
  myLinks: LinkSyncItem[];
};
export const useSortedLayerQueries = <
  T extends ProstglesTimeChartLayer | LayerQuery,
>({
  layerQueries,
  myLinks,
}: Args<T>) => {
  return layerQueries
    .map((lq) => {
      const link = myLinks.find((l) => l.id === lq.linkId);
      if (!link) return undefined;
      return {
        ...lq,
        link,
      };
    })
    .filter(isDefined)
    .sort((a, b) => {
      return (
        new Date(a.link.created ?? 0).getTime() -
        new Date(b.link.created ?? 0).getTime()
      );
    });
};
