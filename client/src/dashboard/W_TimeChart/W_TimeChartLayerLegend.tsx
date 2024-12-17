import React from "react";
import { FlexRow } from "../../components/Flex";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { useSortedLayerQueries } from "../WindowControls/ChartLayerManager";
import { ColorByLegend } from "../WindowControls/ColorByLegend";
import { LayerColorPicker } from "../WindowControls/LayerColorPicker";
import { TimeChartLayerOptions } from "../WindowControls/TimeChartLayerOptions";
import type {
  ProstglesTimeChartLayer,
  ProstglesTimeChartStateLayer,
} from "./W_TimeChart";
import Btn from "../../components/Btn";
import { mdiClose } from "@mdi/js";

type P = Pick<CommonWindowProps, "getLinksAndWindows" | "myLinks" | "prgl"> & {
  layerQueries: ProstglesTimeChartLayer[];
  layers: ProstglesTimeChartStateLayer[];
  onChanged: VoidFunction;
  w: WindowSyncItem<"timechart">;
};

export const W_TimeChartLayerLegend = ({
  layerQueries,
  layers,
  onChanged,
  ...props
}: P) => {
  const {
    w,
    myLinks,
    prgl: { tables },
  } = props;
  // const groupedByLayer = layerQueries.find(lq => !lq.disabled && lq.groupByColumn && lq.type === "table");

  const activeLayerQueries = useSortedLayerQueries({
    layerQueries,
    myLinks,
  }).filter((l) => !l.disabled);

  return (
    <FlexRow className="W_TimeChartLayerLegend min-w-0 o-auto">
      {activeLayerQueries.map(
        ({ _id, linkId, dateColumn, groupByColumn, link }) => {
          return (
            <FlexRow key={_id} className="gap-0">
              {!groupByColumn && (
                <LayerColorPicker
                  btnProps={{ size: "micro" }}
                  title={"layerDesc"}
                  column={dateColumn}
                  link={link}
                  myLinks={myLinks}
                  tables={tables}
                  w={w}
                  getLinksAndWindows={props.getLinksAndWindows}
                />
              )}

              <TimeChartLayerOptions
                w={w}
                getLinksAndWindows={props.getLinksAndWindows}
                link={link}
                myLinks={myLinks}
                tables={tables}
                column={dateColumn}
                mode="on-screen"
              />
              {groupByColumn && (
                <ColorByLegend
                  {...props}
                  className="ml-1"
                  layers={layers}
                  layerLinkId={linkId}
                  groupByColumn={groupByColumn}
                  onChanged={onChanged}
                />
              )}
              <Btn
                iconPath={mdiClose}
                size="micro"
                onClick={() => {
                  const isLastLayer = activeLayerQueries.length === 1;
                  link.$update({ closed: true, deleted: true });
                  if (isLastLayer && w.parent_window_id) {
                    w.$update({ closed: true, deleted: true });
                  }
                }}
              />
            </FlexRow>
          );
        },
      )}
    </FlexRow>
  );
};
