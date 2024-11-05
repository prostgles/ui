import React from "react";
import type { ProstglesTimeChartLayer, ProstglesTimeChartStateLayer } from "./W_TimeChart";
import { ColorByLegend } from "../WindowControls/ColorByLegend";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import { FlexRow } from "../../components/Flex";
import { LayerColorPicker } from "../WindowControls/LayerColorPicker";
import { TIMECHART_STAT_TYPES } from "./W_TimeChartMenu";
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import { TimeChartLayerOptions } from "../WindowControls/TimeChartLayerOptions";

type P = Pick<CommonWindowProps, "getLinksAndWindows" | "myLinks" | "prgl" | "w"> & {
  layerQueries: ProstglesTimeChartLayer[];
  layers: ProstglesTimeChartStateLayer[];
  onChanged: VoidFunction;
}

export const W_TimeChartLayerLegend = ({ layerQueries, layers, onChanged, ...props }: P) => {
  const { w, myLinks, prgl: { tables } } = props;
  if(w.type !== "timechart") return null;
  // const groupedByLayer = layerQueries.find(lq => !lq.disabled && lq.groupByColumn && lq.type === "table");

  return <FlexRow>
    {layerQueries.filter(l => !l.disabled).map(({ statType, _id, linkId, dateColumn, groupByColumn, disabled }) => {
      const link = myLinks.find(l => l.id === linkId);
      if(!link) return null;
      const activeStat = TIMECHART_STAT_TYPES.find(s => s.func === (statType?.funcName ?? "$countAll"));
      // const funcInfo = statType? `${activeStat?.label ?? statType.funcName}(${statType.numericColumn})` : activeStat?.label ?? "Count All";

  
      return <FlexRow 
        key={_id}
        className="gap-0"
      >
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

        <TimeChartLayerOptions 
          w={w} 
          getLinksAndWindows={props.getLinksAndWindows} 
          link={link} 
          myLinks={myLinks} 
          tables={tables} 
          column={dateColumn} 
          btnProps={{ variant: "text" }}
        />
        {groupByColumn && 
          <ColorByLegend
            { ...props}
            layers={layers}
            layerLinkId={linkId}
            groupByColumn={groupByColumn}
            onChanged={onChanged}
          />
        }
        {/* <PopupMenu
          button={
            <Btn>
              {dateColumn},
              {funcInfo}
            </Btn>
          }
        >
        </PopupMenu> */}
      </FlexRow>
    })}
  </FlexRow>
};