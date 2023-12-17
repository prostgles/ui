import { mdiClose, mdiEye, mdiEyeOff, mdiLayers, mdiScript, mdiSetCenter, mdiTable } from "@mdi/js";
import React from "react";
import Btn, { BtnProps } from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import { Link } from "../Dashboard/dashboardUtils";
import { LayerQuery, W_MapProps } from "../W_Map/W_Map";
import type { ProstglesTimeChartLayer, ProstglesTimeChartProps } from "../W_TimeChart/W_TimeChart";
import { AddChartLayer } from "./AddChartLayer";
import { LayerColorPicker } from "./LayerColorPicker";
import { LayerFilterManager } from "./LayerFilterManager";
import { TimeChartLayerOptions } from "./TimeChartLayerOptions";

export type MapLayerManagerProps = 
(
  | {
      type: "timechart";
      layerQueries: ProstglesTimeChartLayer[];
    } & ProstglesTimeChartProps 
  | {
    type: "map";
  } & W_MapProps
) & {
  asMenuBtn?: BtnProps<void>;
};

// TODO: Show columns grouped by their link
export const ChartLayerManager = (props: MapLayerManagerProps) => {
  const { myLinks, prgl: {dbs}, type, asMenuBtn, tables, getLinksAndWindows, w } = props;
  const isMap = type === "map";
  
  const layerQueries = (props.layerQueries ?? []) as (ProstglesTimeChartLayer | LayerQuery)[];
  const content = <div className="flex-col gap-p5">
    <div className="flex-col gap-1">
      {layerQueries.sort((a, b) => a._id.localeCompare(b._id))
        .map((lqRaw, i)=> {
          const lq = lqRaw as LayerQuery | ProstglesTimeChartLayer;
          const thisLink = myLinks.find(l => l.id === lq.linkId);
          if(!thisLink || thisLink.options.type === "table") return null;
          let column = "";

          if(isMap){
            const lq = lqRaw as LayerQuery;
            column = lq.geomColumn;
          } else {
            const lq = lqRaw as ProstglesTimeChartLayer;
            column = lq.dateColumn;
          }
  

          const lTypeInfo = lq.type === "sql"? { 
            type: "SQL" as const, 
            value: lq.sql 
          } : { 
            type: "Table" as const, 
            value: lq.tableName,  
            path: lq.path 
          };
          const isLocal = thisLink.w1_id === thisLink.w2_id;
          // const chartCols = lTypeInfo.type === "Table" && lTypeInfo.cols;

          return <div key={i} className={`LayerQuery ai-center flex-row-wrap gap-1 ta-left b b-gray-300 rounded ${window.isMobileDevice? "" : "p-1"}`}>
            
            <LayerColorPicker title="Change color" column={column} link={thisLink} myLinks={myLinks} />
            
            <Btn 
              iconProps={{ 
                path: lTypeInfo.type === "Table"? (isLocal? mdiTable : mdiSetCenter) : mdiScript,
                style: isLocal? {} : {
                  color: "var(--action)"
                }
              }} 
              className={" ws-nowrap o-auto bg-1 rounded px-p75 py-p75 o-hidden"}  
              title={lTypeInfo.type === "Table"? `Table name` : "SQL Script"}
            >
              {lTypeInfo.type === "Table"? `${lTypeInfo.path?.at(-1)?.table || lTypeInfo.value} (${column})` : lTypeInfo.value}
            </Btn>
            {/* {chartCols && <Select 
              value={column}
              btnProps={chartCols.length > 1? { color: "action" } : {}}
              fullOptions={lTypeInfo.cols.map(c => ({ key: c.name, subLabel: c.udt_name }))}
              onChange={col => {
                const opts = quickClone(thisLink.options);
                if(opts.type === "timechart"){
                  opts.columns
                }
                thisLink.$update({ options: { type } })
              }}
            />} */}


            <TimeChartLayerOptions 
              w={w as any} 
              getLinksAndWindows={getLinksAndWindows} 
              link={thisLink} 
              myLinks={myLinks} 
              tables={tables} 
              column={column} 
            />

            <LayerFilterManager {...props} linkId={lq.linkId} />

            <Btn 
              title="Toggle layer on/off" 
              className={`ml-auto ${thisLink.disabled? "" : "show-on-parent-hover"} `}
              iconPath={thisLink.disabled? mdiEyeOff : mdiEye} 
              color={"action"}
              onClick={() => {
                if(thisLink.options.type === "table") return;
                return thisLink.$update({ disabled: !thisLink.disabled });
              }}
            />

            <Btn color="danger"
              title="Remove layer"
              className="show-on-parent-hover"
              onClickPromise={async () => {
                if(thisLink.options.type === "table") return;
                const opts = thisLink.options;
                const newOpts: Link["options"] = {
                  ...opts,
                  columns: opts.columns.filter(c => c.name !== column),
                };
                if(newOpts.columns.length === 0){
                  return dbs.links.update({ id: lq.linkId }, { closed: true, last_updated: Date.now() });
                }
                return thisLink.$update({ options: newOpts}, { deepMerge: true });
              }} 
              iconPath={mdiClose}
            />
          </div>
        })}

      <AddChartLayer { ...props } />
    </div>
  </div>;

  if(asMenuBtn){
    const title = "Manage layers";
    return <PopupMenu 
      title={title}
      button={<Btn iconPath={mdiLayers} title={title} { ...asMenuBtn } />}
      render={pClose => content}
    />
  }

  return content;
}
