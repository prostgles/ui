import React from "react"; 

import { isDefined } from "../../utils";

import { mdiCog, mdiDelete, mdiLayersOutline, mdiMap, mdiPalette, mdiPlus, mdiRefresh, mdiSearchWeb, mdiSyncCircle } from '@mdi/js';
import Btn from "../../components/Btn";
import Select from "../../components/Select/Select";
import { AutoRefreshMenu } from "../W_Table/TableMenu/AutoRefreshMenu";
import Tabs, { TabItem } from "../../components/Tabs"; 
import Chip from "../../components/Chip";
import FormField from "../../components/FormField/FormField"; 
import { W_MapProps } from "./W_Map";
import ButtonGroup from "../../components/ButtonGroup";
import PopupMenu from "../../components/PopupMenu";
import SmartTable from "../SmartTable";
import { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu"; 
import { DEFAULT_TILE_URLS } from "../Map/mapUtils";
import { SwitchToggle } from "../../components/SwitchToggle";
import { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { ChartLayerManager } from "../WindowControls/ChartLayerManager";
import { FlexRow } from "../../components/Flex";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
export const MAP_PROJECTIONS = ["mercator", "orthographic"] as const;

type ProstglesMapMenuProps = W_MapProps & {
  w: WindowSyncItem<"map">;
  tileURL?: string; 
  setTileURL: (url: string) => void;
  bytesPerSec: number;
}

export default function ProstglesMapMenu(props: ProstglesMapMenuProps){

  const { w, tileURL, setTileURL, tables, prgl } = props;

  let coloredCols: ColumnConfig[] = [];
  if(Array.isArray(w.columns)){
    coloredCols = w.columns.filter(c => c.style?.type !== "None")
  }

  let colorMenu: Record<string, TabItem> = {};
  if(coloredCols.length){
    colorMenu  = {
      "Color": {
        leftIconPath: mdiPalette,
        content:  <Select
          label="Bin size"
          variant="div" 
          className="w-fit b b-gray-300 mb-1" 
          options={coloredCols.map(({ name }) => name)} 
          value={w.options.colorField} 
          onChange={(colorField: string) => {
            w.$update({ options: { colorField } }, { deepMerge: true })
          }} 
        />
      },
    }
  }

  const setBaseImageURL = async url => {

    const set = (height = 100, width = 100) => {
      w.$update({ options: {  basemapImage: { url, bounds: [0, 0, width, height]  } } }, { deepMerge: true }) 
    }


    try {
      const img = new Image();
      img.onload = function(){
        const height = img.height;
        const width = img.width;
        set(height, width)
      }
      img.onerror = (e) => {
        console.error(e)
        set()
      }
      img.src = url;
    } catch (e) {
      set()
      console.error(e)
      // w.$update({ options: {  basemapImage: { url, bounds: [0, 0, width, height]  } } }, { deepMerge: true }) 
    }
  }
  
  const mediaTable = tables.find(t => t.info.isFileTable);

  const tileURLs = (w.options.tileURLs?.length? w.options.tileURLs : DEFAULT_TILE_URLS)
  const projection = w.options.projection ?? "mercator";
  return <Tabs variant="vertical"
    compactMode={window.isMobileDevice}
    contentClass="p-1"
    items={{
      "Data Refresh": {
        leftIconPath: mdiSyncCircle,
        content: <AutoRefreshMenu w={w} />
      },
      "Basemap": {
        leftIconPath: mdiMap,
        content: <div className="flex-col gap-1">


          <ButtonGroup 
            options={MAP_PROJECTIONS}
            value={projection} 
            onChange={projection => {
              w.$update({ options: { projection } }, { deepMerge: true }) 
            }}
          />
          {projection !== "mercator"? <>
            <FormField  
              type="text"
              label="Basemap Image URL"
              autoComplete="off"
              asColumn={true}
              value={w.options.basemapImage?.url}
              onChange={setBaseImageURL}
              rightIcons={mediaTable && 
                <PopupMenu
                  button={<Btn iconPath={mdiSearchWeb} title="From data" size={"small"} />}
                  render={pClose => {
                    return <SmartTable 
                      theme={prgl.theme}
                      title="Click row to select" 
                      db={prgl.db} 
                      tableName={mediaTable.name}  
                      tables={tables}
                      methods={prgl.methods} 
                      filter={[{ fieldName: "content_type", type: "$ilike", value: "%image%", minimised: true }]} 
                      onClickRow={row => {
                        if(row) {
                          setBaseImageURL(row.url);
                          pClose();
                        }
                      }}
                    />
                  }}
                />
                
              }
            />
          </> : <>
            <FormField  
              type="text"
              label="Attribution"
              autoComplete="off"
              asColumn={true}
              value={w.options.tileAttribution?.title}
              onChange={title => {
                w.$update({ options: { tileAttribution: {...(w.options.tileAttribution || {}), title } } }, { deepMerge: true }) 
              }} 
            />
            <FormField  
              type="url"
              label="Attribution URL"
              autoComplete="off"
              asColumn={true}
              value={w.options.tileAttribution?.url}
              onChange={url => {
                w.$update({ options: { tileAttribution: { ...(w.options.tileAttribution || {}), url } } }, { deepMerge: true }) 
              }} 
            />
            <div className="ta-left text-1 font-medium mt-1">Tile URLs</div>
            {tileURLs.map((turl, i) => (
              <div key={i} className="flex-row ai-center py-p5 o-auto">
                <Btn iconPath={mdiDelete}  
                  color="danger"
                  onClick={() => {
                    w.$update({ options: { tileURLs: tileURLs.filter(t => t !== turl) } }, { deepMerge: true }) 
                  }}
                />
                <Chip variant="naked" value={turl} />
              </div>
            ))}
            <div className="ta-left text-gray-400">Delete all tiles to restore default</div>
            <div className="flex-row mt-1">
              <FormField  
                type="text"
                asTextArea={true}
                value={tileURL}
                onChange={setTileURL} 
              />
              <Btn iconPath={mdiPlus} 
                color="action"
                onClick={() => {
                  const urls = Array.from(new Set([...tileURLs, tileURL])).filter(isDefined)
                  w.$update({ options: { tileURLs: urls } }, { deepMerge: true });
                  setTileURL("");
                }}
              />
            </div>
            <FormField  className=" mt-1"
              label="Tile size"
              asColumn={true}
              value={w.options.tileSize || 256}
              options={[16, 32, 64, 128, 256, 512, 1024]}
              onChange={tileSize => {
                w.$update({ options: { tileSize } }, { deepMerge: true })
              }} 
            />
          </>}
        </div>
      },
      "Layers": {
        leftIconPath: mdiLayersOutline,
        content:  <ChartLayerManager { ...props} type="map" />
      },
      ...colorMenu,
      "Settings": {
        leftIconPath: mdiCog,
        content: <div className="flex-col gap-1">
            <FlexRow className="gap-2 ai-start">
              <Select 
                className="w-fit mt-p25"
                label="Aggregation mode"
                value={w.options.aggregationMode?.type ?? "wait"}
                fullOptions={[
                  { key: "limit", label: "Limit", subLabel: "Will aggregate if the total number of features higher than specified" },
                  { key: "wait", label: "Download time", subLabel: "Will aggregate/simplify if data load takes longer than specified" },
                ]}
                onChange={type => {
                  w.$update({ options: { aggregationMode: { type } }}, { deepMerge: true })
                }}
              />
              {w.options.aggregationMode?.type === "limit"? 
                <FormFieldDebounced   
                  type="number" 
                  style={{ width: "200px" }}
                  label="Result count limit"
                  value={w.options.aggregationMode.limit || 1000} 
                  inputProps={{ min: 1, step: 1 }}
                  onChange={e => {
                    w.$update({ options: { aggregationMode: { limit: +e } }}, { deepMerge: true });
                  }}
                /> : 
                <FormFieldDebounced   
                  type="number" 
                  style={{ width: "200px" }}
                  label="Wait time in seconds" 
                  hint={`Current connection is approx. ${(props.bytesPerSec/1000).toFixed(1)} MB/s`}
                  value={w.options.aggregationMode?.wait ?? 2} 
                  inputProps={{ min: 0 }}
                  onChange={e => {
                    w.$update({ options: { aggregationMode: { wait: +e } }}, { deepMerge: true })
                  }}
                />
              }
            </FlexRow> 
            <SwitchToggle 
              label={`Show Add/Edit shape button`}
              checked={!!w.options.showAddShapeBtn}
              onChange={showAddShapeBtn => {
                w.$update({ options: { showAddShapeBtn } }, { deepMerge: true })
              }}
            /> 
            <SwitchToggle 
              label={`Hide layers button`}
              checked={!!w.options.hideLayersBtn}
              onChange={hideLayersBtn => {
                w.$update({ options: { hideLayersBtn } }, { deepMerge: true })
              }}
            /> 
            <SwitchToggle 
              label={`Show row card on click`}
              checked={!!w.options.showCardOnClick}
              onChange={showCardOnClick => {
                w.$update({ options: { showCardOnClick } }, { deepMerge: true })
              }}
            /> 
        </div>
      }
    }}
  /> 
}