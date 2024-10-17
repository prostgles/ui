import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import React from "react";
import { FlexCol } from "../../components/Flex";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import type { LinkSyncItem, WindowData } from "../Dashboard/dashboardUtils";
import type { RGBA } from "../W_Table/ColumnMenu/ColorPicker";
import { ColorCircle, ColorPicker } from "../W_Table/ColumnMenu/ColorPicker";
import type { MapLayerManagerProps } from "./ChartLayerManager";
import { IconPalette } from "../../components/IconPalette/IconPalette";

type P = {
  link: LinkSyncItem;
  column: string;
  myLinks: LinkSyncItem[];
  title?: string;
  w: SyncDataItem<Required<WindowData<"timechart">>, true> | SyncDataItem<Required<WindowData<"map">>, true>
} & Pick<MapLayerManagerProps, "tables" | "w" | "getLinksAndWindows">;

export const LayerColorPicker = ({ link, column, myLinks, title, tables, w, getLinksAndWindows }: P) => {
  if(link.options.type === "table"){
    return null;
  }
  const rgba: RGBA = link.options.columns.find(c => c.name === column)?.colorArr ?? link.options.colorArr ?? [100,100,100] as any;
  const opts = link.options;

  if(opts.type === "map"){
    const otherW = getLinksAndWindows().windows.find(ow => [link.w1_id, link.w2_id].includes(ow.id) && w.id !== ow.id);
    const table = tables.find(t => t.name === (opts.localTableName ?? otherW?.table_name));
    return <PopupMenu 
      title="Layer style"
      button={<ColorCircle color={`rgba(${getLinkColor(link)})`} />}
      render={pClose => <FlexCol>
        <IconPalette 
          iconName={opts.mapIcons?.type === "fixed"? opts.mapIcons.iconPath : undefined}
          onChange={iconPath => {
            const thisLink = myLinks.find(l => l.id === link.id);
            if(thisLink && thisLink.options.type !== "table"){
              const opts = thisLink.options;
              thisLink.$update(
                { 
                  options: { 
                    ...opts,
                    mapIcons: !iconPath? undefined : {
                      type: "fixed",
                      iconPath
                    }
                  } 
                }, 
                { deepMerge: true }
              );
            }
          }}
        />
        {table && 
          <Select 
            label={"Show labels"}
            value={opts.mapShowText?.columnName}
            fullOptions={table.columns.map(c => ({
              key: c.name,
              subLabel: c.data_type,
              disabledInfo: !["text", "int4", "int8", "date", "timestamp", "varchar", "name"].includes(c.udt_name)? "Only text columns can be used for labels" : undefined,
            }))}
            optional={true}
            onChange={columnName => {
              const thisLink = myLinks.find(l => l.id === link.id);
              if(thisLink && thisLink.options.type !== "table"){
                const opts = thisLink.options;
                thisLink.$update(
                  { 
                    options: { 
                      ...opts,
                      mapShowText: {
                        columnName
                      }
                    } 
                  }, 
                  { deepMerge: true }
                );
              }
            }}
          />
        }
        <ColorPicker 
          style={{ flex: "none" }}
          label="Layer color"
          title={title}
          required={true}
          className="w-fit m-p5 text-2"
          value={`rgba(${rgba})`} 
          onChange={(colorStr, _, colorArr) => {
            const thisLink = myLinks.find(l => l.id === link.id);
            if(thisLink && thisLink.options.type !== "table"){
              const opts = thisLink.options;
              thisLink.$update(
                { 
                  options: { 
                    ...opts,
                    mapColorMode: {
                      type: "fixed",
                      colorArr,
                    },
                    columns: opts.columns.map(c => ({
                      ...c,
                      colorArr: c.name === column? colorArr : c.colorArr
                    })),
                  } 
                }, 
                { deepMerge: true }
              );
            }
          }} 
        />
      </FlexCol>}
    />
  }

  return <ColorPicker 
    style={{ flex: "none" }}
    // label="Layer color"
    title={title}
    required={true}
    className="w-fit m-p5 text-2"
    value={`rgba(${rgba})`} 
    onChange={(colorStr, colorArr) => {
      const thisLink = myLinks.find(l => l.id === link.id);
      if(thisLink && thisLink.options.type !== "table"){
        const opts = thisLink.options;
        thisLink.$update(
          { 
            options: { 
              ...opts,
              colorArr,
              columns: opts.columns.map(c => ({
                ...c,
                colorArr: c.name === column? colorArr : c.colorArr
              })),
            } 
          }, 
          { deepMerge: true }
        );
      }
    }} 
  />
}

const getLinkColor = (link: LinkSyncItem) => {
  const { colorArr } = link.options
  if(link.options.type === "table") return;
  if(link.options.type === "map"){
    if(link.options.mapColorMode?.type === "fixed"){
      return link.options.mapColorMode.colorArr;
    }
    if(link.options.mapColorMode?.type === "scale"){
      return link.options.mapColorMode.minColorArr;
    }
    if(link.options.mapColorMode?.type === "conditional"){
      return link.options.mapColorMode.conditions[0]?.colorArr ?? colorArr;
    }
  }
  return colorArr;
}