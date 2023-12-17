import { mdiSetSplit, mdiSigma, mdiTableColumn } from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "../../components/Flex";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import { LinkSyncItem, windowIs, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { getTimeChartLayer } from "../W_TimeChart/getTimeChartLayers";
import { TIMECHART_STAT_TYPES } from "../W_TimeChart/W_TimeChartMenu";
import { MapLayerManagerProps } from "./ChartLayerManager";

type TimeChartLayerOptionsProps = Pick<MapLayerManagerProps, "tables" | "myLinks" | "getLinksAndWindows"> & {
  link: LinkSyncItem;
  column: string;
  w: WindowSyncItem;
}
export const TimeChartLayerOptions = ({ link, column, tables, getLinksAndWindows, myLinks, w: wMapOrTimechart }: TimeChartLayerOptionsProps) => {

  if(!windowIs(wMapOrTimechart, "timechart")){
    return null;
  }
  const w = wMapOrTimechart as WindowSyncItem<"timechart">;
  const opts = link.options;
  if(opts.type !== "timechart"){
    return null;
  }
  
  const colOpts = opts.columns.find(dc => dc.name === column);
  if(!colOpts){
    return <>Column not found: {column}</>
  }
  
  const {windows, links} = getLinksAndWindows();
  const lq = getTimeChartLayer({ active_row: undefined, link, windows, links, myLinks, w }).find(l => l.dateColumn === column);

  const table = lq?.type === "table"? tables.find(t => t.name === lq.tableName) : undefined;
  const numericCols = table?.columns.filter(c => c.tsDataType === "number") || [];
  const statType = colOpts.statType ?? { funcName: "$countAll", numericColumn: undefined };
  const linkOpts = link.options;
  if(linkOpts.type !== "timechart"){
    return <>Invalid link type: {linkOpts.type}</>;
  }

  const updateLinkOpts = (newOpts: Partial<typeof linkOpts>) => {
    link.$update({
      options: newOpts,
    }, { deepMerge: true })
  };
  
  const updateCol = (col: string, newColOpts: Partial<typeof colOpts>) => {
    updateLinkOpts({
      ...opts,
      columns: opts.columns.map(c => c.name === col? ({ ...c, ...newColOpts }) : c )
    })
  };
  const activeStat = TIMECHART_STAT_TYPES.find(s => s.func === statType.funcName);
  const activeStatLabel: typeof TIMECHART_STAT_TYPES[number]["label"] = activeStat?.label ?? statType.funcName as any;
  const activeStatLabelDesc = activeStatLabel === "Count All"? activeStatLabel : `${activeStatLabel}(${colOpts.statType?.numericColumn})`;
  const groupByCols = table?.columns.filter(c => c.name !== lq?.statType?.numericColumn && c.name !== lq?.dateColumn && ["string", "boolean", "number"].includes(c.tsDataType));

  return <>
    <PopupMenu 
      title="Y-axis options"
      button={
        <FlexRow style={{ gap: ".5em", fontSize: "14px" }}>
          <Btn color="action" variant="faded" iconPath={mdiSigma} title="Aggregate function">
            {activeStatLabelDesc}
          </Btn>
          {lq?.groupByColumn && 
            <Btn color="action" variant="faded" title="Group by column" iconPath={mdiTableColumn}>
              {lq.groupByColumn}
            </Btn>
          }
        </FlexRow>
      }
      render={() => 
        <FlexCol className="gap-2">
          <FlexRowWrap>
            <Select
              label="Aggregation type"
              variant="div" 
              className="w-fit"
              btnProps={{
                iconPath: mdiSigma,
                color: "action",
                iconPosition: "left",
              }}
              fullOptions={
                TIMECHART_STAT_TYPES
                  .map(s => ({
                    key: s.func,
                    label: s.label,
                    disabledInfo: (numericCols.length || s.func === "$countAll")? undefined : "Requires a numeric column"
                  }))
                } 
              value={statType.funcName} 
              onChange={(funcName) => {
                updateCol(colOpts.name, { statType: { funcName, numericColumn: statType.numericColumn ?? numericCols[0]!.name! } })
              }} 
            />
            {statType.funcName !== "$countAll" && numericCols.length > 0 && 
              <Select
                label="field"
                variant="div" 
                className="w-fit " 
                fullOptions={numericCols.map(c => ({
                  key: c.name,
                  subLabel: c.udt_name,
                  ...c,
                }))} 
                value={colOpts.statType?.numericColumn} 
                onChange={numericColumn => {
                  updateCol(colOpts.name, { statType: { ...statType, numericColumn } })
                }}
              />
            }
            
          </FlexRowWrap>
          {!!groupByCols?.length && <Select
            label="Group by field"
            variant="div" 
            className="w-fit "
            optional={true}
            btnProps={{
              iconPath: mdiTableColumn,
              color: "action",
              iconPosition: "left",
            }}
            fullOptions={[
              {
                key: undefined,
                label: "NONE"
              },
              ...groupByCols.map(s => ({ key: s.name, label: s.label, subLabel: s.udt_name }))
            ]}
            value={lq?.groupByColumn} 
            onChange={groupByColumn => {
              updateLinkOpts({ groupByColumn });
            }}
          />}
        </FlexCol>
      } 
    />
  </>
}