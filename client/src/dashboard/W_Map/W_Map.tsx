import { AnyObject, getKeys, isDefined, isEmpty, ParsedJoinPath, reverseParsedPath } from "prostgles-types";
import React from "react";
import ErrorComponent from "../../components/ErrorComponent";
import Loading from "../../components/Loading";
import Popup from '../../components/Popup/Popup';
import { CommonWindowProps } from "../Dashboard/Dashboard";
import { WindowData, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { DeckGLMap, GeoJSONFeature, GeoJsonLayerProps, HoverCoords, MapHandler } from "../Map/DeckGLMap";
import RTComp, { DeltaOfData } from "../RTComp";
import W_Table, { ActiveRow } from "../W_Table/W_Table";
import Window from '../Window';
import { ChartLayerManager } from "../WindowControls/ChartLayerManager";
import ProstglesMapMenu from "./W_MapMenu";
import { getMapDataExtent } from "./getMapDataExtent";
import { HoveredObject, onMapHover } from "./onMapHover";
import { setMapLayerData } from "./setMapLayerData"; 
import SmartForm from "../SmartForm/SmartForm";
import { isObject } from "../../../../commonTypes/publishUtils";
import { getMapSelect } from "./getMapData";
 

export type LayerBase = {
  /** 
   * Link id + layer col index
   * */
  _id: string;

  /** 
   * Link id 
   * */
  linkId: string;

  color: string;

  /** If missing then it's a local layer */
  wid?: string;
  fillColor?: number[];
  lineColor?: number[];
  getLineColor?: () => number[];
  elevation?: number;
  geomColumn: string;
  
  /** 
   * Columns to show on hover. Will be selected
   * Defaults to all columns
   */
  tooltipColumns?: string[];
  tooltipRender?: (row: AnyObject) => React.ReactNode;

  disabled: boolean;
}

export type LayerSQL = LayerBase & {
  type: "sql";
  sql: string;
  parameters?: any;
}

export type LayerTable = LayerBase & {
  type: "table";
  tableName: string;
  externalFilters: AnyObject[];
  tableFilter?: AnyObject;
  joinFilter?: AnyObject;
} & ({
  joinStartTable: string;
  path: ParsedJoinPath[];
} | {
  joinStartTable: undefined;
  path: undefined;
})

export type LayerQuery = LayerTable | LayerSQL;

export type W_MapProps = CommonWindowProps<"map"> & {
  layerQueries?: LayerQuery[]; 
  onClickRow: (row: AnyObject | undefined, tableName: string) => any;
  myActiveRow: ActiveRow | undefined;
};

export type MapLayerExtras = Record<string, { colorStr: string; color: [number, number, number];}>;

type ClickedItem =  GeoJSONFeature & {
  properties: {
    geomColumn: string;
    tableName: string;
    l: GeoJSON.Geometry
  } & ({
    i: AnyObject | string;
  } | {
    /** Aggregation size */
    c: string;
    radius: number;
    i?: undefined;
  });
}

export type W_MapState = {
  loading: boolean;
  loadingLayers: boolean;
  wSync: any;
  minimised: boolean;
  layers?: GeoJsonLayerProps[];
  lqs: LayerQuery[];
  error: any; 
  hoverObj?: any;
  hoverCoords?: HoverCoords;
  hovData?: any;
  tileURL?: string;

  bytesPerSec: number;
  dataAge: number;

  drawingShape?: GeoJSONFeature;

  isDrawing?: boolean;

  clickedItem?: ClickedItem;
}

type D = { 
  w: WindowSyncItem<"map">;
}

export default class W_Map extends RTComp<W_MapProps, W_MapState, D> {

  refHeader?: HTMLDivElement;
  refResize?: HTMLElement;
  ref?: HTMLElement;

  state: W_MapState = {
    loadingLayers: false,
    loading: false,
    wSync: null,
    minimised: false,
    // layers: [],
    lqs: [],
    error: null, 
    hoverObj: undefined,
    hoverCoords: undefined,
    hovData: undefined,
    bytesPerSec: 0,
    dataAge: 0,
  }

  getDataSignature(
    args: Parameters<typeof W_Table.getDataRequestSignature>[0], 
    dataAge: number,
    layer: LayerQuery,
    other: any,
  ): { signature: string; cachedLayer?: GeoJsonLayerProps } {
    const signature = W_Table.getDataRequestSignature(args, dataAge, [layer, other]);
    const cachedLayer = this.state.layers?.find(l => l.dataSignature === signature);
    
    return { signature, cachedLayer };
  }

  onMount(){
    const { w } = this.props;
    if(!this.state.wSync){
      const wSync = w.$cloneSync((w, delta) => {
          this.setData({ w }, { w: delta as any });
        }
      );
      this.setState({ wSync })
    }
  }
  onUnmount(){
    this.state.wSync?.$unsync?.();
    this.layerSubs.map(s => {
      s.sub.unsubscribe()
    })
  }

  goToDataExtent = async () => {
    let extent;
    try {
      extent = await this.getDataExtent();
      if(extent && this.d.w){
        this.d.w.$update({ options: { extent: extent.flat() } }, { deepMerge: true });
        this.map?.fitBounds(extent);
      } else {
        // return
      }
      
    } catch(error: any){
      if(this.state.error?.toString() !== error.toString()){
        this.setState({ error });
      }
      console.error(error)
      return;
    }
  }

  autoRefreshInterval;
  gettingExtent = false;
  onDelta = async (dp: Partial<W_MapProps>, ds: Partial<W_MapState>, dd: DeltaOfData<D>) => {
    const delta = ({ ...dp, ...ds, ...dd });

    // console.log(delta)
    
    const ns: any = {};

    if(this.d.w){

      if(!this.gettingExtent && !this.d.w.options.extent && this.props.layerQueries?.length){
        this.gettingExtent = true;
        // this.setState({ loadingExtent: true })
        setTimeout(() => {
          if(this.mounted){
            this.goToDataExtent();
            this.gettingExtent = false;
            // this.setState({ loadingExtent: false })
          }
        }, 600)
      }
      const deltaOpts = delta.w?.options ?? {} as WindowData<"map">["options"];
      const changedOpts = getKeys(deltaOpts || {});
      const changedWkeys = getKeys(delta.w || {});
      
      if(delta.dataAge || delta.layerQueries || changedOpts.length || changedOpts.includes("refresh") || changedOpts.includes("aggregationMode") ){
        this.setLayerData(this.state.dataAge);

        if(changedOpts.includes("refresh")){
          const { refresh } = this.d.w.options!;

          if(this.autoRefreshInterval){
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = undefined;
          }
          if(refresh?.type === "Interval" && refresh.intervalSeconds){

            this.autoRefreshInterval = setInterval(() => {
              this.setLayerData(Date.now());

            }, 1000 * refresh.intervalSeconds)
          }
        }
      }

      if(this.d.w.options.filterExtent && changedOpts.includes("extent") || changedOpts.includes("filterExtent")){
        this.props.onForceUpdate();
      }
    }



    if(!isEmpty(ns)){
      this.setState(ns);
    }
  }

  layerSubs: { 
    filter: string;
    tableName: string;
    sub: any;
  }[] = [];

  static extentToFilter = (ext: number[], geomColumn: string): AnyObject => ({ [`${geomColumn}.&&.st_makeenvelope`]: ext  })

  getFilter = (lTable: LayerTable, ext4326: number[]): { finalFilter: AnyObject; finalFilterWOextent: AnyObject; isJoin: boolean; } => {
    const { geomColumn,  externalFilters, path } = lTable;
    
    const isJoin = !!path?.length;
    

    /** Extent filter must be outside exists */
    // const finalFilterWOextent = wrapFilterIfJoined({ $and: [tableFilter, ...externalFilters].filter(isDefined) }, path, lTable.tableName)!;
    const finalFilterWOextent = { $and: [ ...externalFilters].filter(isDefined) };

    /* We use a current extent filter UNLESS a joinFilter (activeRow) filter is applied because the items might be outside of our extent */
    const currentExtentFilter = W_Map.extentToFilter(ext4326, geomColumn);
    // const finalFilter = { $and: [finalFilterWOextent, wrapFilterIfJoined(joinFilter, path, lTable.tableName) || currentExtentFilter].filter(isDefined) };
    const finalFilter = { $and: [ ...externalFilters, currentExtentFilter].filter(isDefined) };


    return { 
      finalFilter, 
      finalFilterWOextent,
      isJoin,
    };
  }

  getSQL = (l: LayerSQL, select: string, limit = 1000): { sql: string, args: AnyObject } => {
    if(!l.sql) throw "No SQL";
    let _sql = l.sql.trim()  + "";
    if(_sql.endsWith(";")) _sql = _sql.slice(0, _sql.length - 1);

    _sql = `SELECT ${select} FROM ( \n  ${_sql} \n ) t LIMIT ${limit}`;
    const args = { ...l.parameters, geomColumn: l.geomColumn };

    return { sql: _sql, args };
  }

  getDataExtent = getMapDataExtent.bind(this);

  dataSignature = "";
  
  lastDataRequest = Date.now();
  loadAgain = false;

  /**
   * Used to fetch and draw layer data
   */
  setLayerData = setMapLayerData.bind(this);

  hoveredObj?: HoveredObject;
  hovering?: {
    hoverObj: HoveredObject;
    hoverObjStr: string;
    timeout?: NodeJS.Timeout;
  }
  onHover = onMapHover.bind(this);

  getMenu = (w: D["w"]) => {
    const { tileURL, bytesPerSec } = this.state;
    return <ProstglesMapMenu 
        { ...this.props }
        w={w} 
        tileURL={tileURL} 
        setTileURL={tileURL => this.setState({ tileURL })}
        bytesPerSec={bytesPerSec}
      />;
  }

  map?: MapHandler;
  render(){
    const { 
      minimised = false, layers: _layers = [], loadingLayers, clickedItem, 
      hoverCoords, hovData, drawingShape, isDrawing, error, 
    } = this.state;
    const { w } = this.d;
    const { layerQueries, onClickRow, prgl } = this.props;
 
    if(!w) return null;

    const layers: typeof _layers = [
      ..._layers,
      ...(drawingShape? [{ 
        dataSignature: "drawingSHAPE", 
        features: [drawingShape], 
        filled: true, 
        id: "drawingSHAPE",
        fillColor: [131, 56, 236, 255],
        getLineWidth: f => 1211,
        layerColor: [131, 56, 236, 255],
        lineColor: [131, 56, 236, 255],
        lineWidth: 1222,
        pickable: true,
        stroked: true,
      }] : [])
    ];

    // !w?.options?.extent && 
    // if(!this.state.layers) return <div className="relative f-1"><Loading variant="cover" /></div>

    let tooltipPopup: React.ReactNode = null;
    if(hovData && hoverCoords && this.ref){
      const { screenCoordinates = [20, 20] } = hoverCoords;
      const mapRect = this.ref.getBoundingClientRect();
      const x = mapRect.x + screenCoordinates[0]
      const y = mapRect.y + screenCoordinates[1]
      tooltipPopup = (
        <Popup 
          clickCatchStyle={{ display: "none" }}
          anchorXY={{ x, y }}
          positioning="tooltip"
          contentClassName="p-p5"
        >
          <div className="bg-0 o-auto flex-col">
            {Object.keys(hovData).map(k => {  //
              let txt = ["string" , "number"].includes(typeof hovData[k])? `${hovData[k]}` : JSON.stringify(hovData[k], null, 2);
              if(txt.length > 20) {
                txt = txt.slice(0, 30) + "...";
              }

              return (
                <div key={k} className="flex-row ai-center" style={{ marginBottom: "4px" }}>
                  <div className="text-medium text-gray font-12" style={{ color: "var(--gray-400)", fontWeight: "bold" }}>{k}:</div>
                  <div className="ml-p5">{txt}</div>
                </div>
              );
          })}
          </div>
        </Popup>
      )
    }

    let infoSection;

    if(loadingLayers){
      infoSection = <div className="f-1 flex-col jc-center ai-center absolute pl-2 mt-1 ml-2">
        <Loading delay={100}/>
      </div>
    }
 
    if(error){
      infoSection = (
        <div className="f-1 flex-row relative m-2 ai-center jc-center absolute p-2 bg-0 rounded" >
          <ErrorComponent title="Map error" withIcon={true} error={error} />
        </div>
      )
    }

    let geoJsonLayers = layers;

    geoJsonLayers = geoJsonLayers.map(l => {
      l.features = l.features.map(f => {
        if(clickedItem?.properties.$rowhash && f.properties && f.properties.$rowhash ===  clickedItem.properties.$rowhash){
          f.properties.fillColor = [0,0,0, 255];// f.properties.fillColor.slice(0,3).map(v => 255 - v).concat([200]);
          f.properties.lineColor = [0,0,0, 255];//f.properties.fillColor.slice(0,3).map(v => 255 - v).concat([200]);
        } else if (f.properties) {
          f.properties.fillColor = l.layerColor;
          f.properties.lineColor = l.layerColor;
        }
        return f;
      });

      return l;
    });
    
    const geoJsonLayersDataFilterSignature = JSON.stringify([layerQueries]);
    const content = <>
      
      {w.options.showCardOnClick && clickedItem?.properties.i && <SmartForm
          theme={prgl.theme}
          asPopup={true}
          confirmUpdates={true}
          hideChangesOptions={true}
          db={prgl.db}
          methods={prgl.methods}
          tables={prgl.tables}
          tableName={clickedItem.properties.tableName} 
          rowFilter={Object.entries(clickedItem.properties.i).map(([fieldName, value]) => ({ fieldName, value }))}
          onSuccess={() => {

            this.setState({ dataAge: Date.now() });
          }}
          onClose={() => this.setState({ clickedItem: undefined })}
        />
      }
      {tooltipPopup} 
      {minimised? null : 
        <div className="relative f-1 flex-col o-hidden" 
          ref={r => {
            if(r) this.ref = r;
          }}
          onPointerLeave={() => {
            // this.ref!.style.cursor = "default";
            this.onHover()
          }}
          style={isDrawing? { cursor: "crosshair" } : {}}
        >  

          {infoSection}
          <DeckGLMap
            onLoad={(map) => {
              this.setLayerData(this.state.dataAge);
              this.map = map;
            }} 
            geoJsonLayersDataFilterSignature={geoJsonLayersDataFilterSignature}
            topLeftContent={
              !w.options.hideLayersBtn && 
                <ChartLayerManager 
                  {...this.props}
                  w={w} 
                  type="map"
                  asMenuBtn={{ 
                    color: "action", 
                    variant: "faded",
                    style: { background: "white" },
                    size: "small",
                    className: "shadow",
                  }} 
                />      
            }
            basemapImage={w.options.basemapImage}
            projection={w.options.projection}
            onClick={(e) => {
              
              const object: ClickedItem | undefined = e.object as any;
              let rowFilter: AnyObject | undefined;
              const filterOrHash: string | AnyObject | undefined = object?.properties.i;
              if(object && filterOrHash){
                if(isObject(filterOrHash)){
                  rowFilter = filterOrHash;
                } else {
                  const table = this.props.tables.find(t => t.name === object.properties.tableName);
                  if(table){
                    rowFilter = { $filter: [getMapSelect({ geomColumn: object.properties.geomColumn }, table.columns)["i"], "=", filterOrHash ] }
                  }
                }
              }
              onClickRow(rowFilter? rowFilter : undefined, e.object?.properties?.tableName);

              const newClickedItem = e.object as any;
              if(JSON.stringify(newClickedItem) !== JSON.stringify(this.state.clickedItem)){
                this.setState({ clickedItem: newClickedItem });
              }
            }}
            tileURLs={(w.options.tileURLs ?? [])
              .map(v => 
                v.replaceAll('{Z}', '{z}')
                  .replaceAll('{X}', '{x}')
                  .replaceAll('{Y}', '{y}') 
              )
            }
            tileSize={w.options.tileSize || 256}
            tileAttribution={w.options.tileAttribution}
            initialState={w.options as any || {}}
            geoJsonLayers={geoJsonLayers}
            options={{
              filterExtent: w.options.filterExtent
            }}
            onOptionsChange={newOpts => {
              w.$update({ options: newOpts }, { deepMerge: true });
            }}
            onMapStateChange={({ extent, latitude, longitude, zoom, pitch, bearing, target }) => {

              /** Ensure the first extent is from data */
              if(w.options.extent){
                w.$update({ options: { target, extent, latitude, longitude, zoom, pitch, bearing } }, { deepMerge: true });
              }
            }}
            onHover={this.onHover}
            onGetFullExtent={this.getDataExtent}
            // onPointerMove={c => c? this.shapeEvents?.onPointerMove(c) : undefined}
            edit={!w.options.showAddShapeBtn? undefined : {
              /** Exclude clicked aggregated shapes from edit feature */
              feature: this.state.clickedItem?.properties.$rowhash? this.state.clickedItem : undefined,
              dbProject: this.props.prgl.db,
              theme: this.props.prgl.theme,
              dbTables: this.props.tables,
              dbMethods: this.props.prgl.methods,
              layerQueries, 
              onInsertOrUpdate: () => {
                this.setState({ dataAge: Date.now(), clickedItem: undefined });
              },
              onStartEdit: () => {

                this.setState({ 
                  // editFeature: this.state.clickedItem, 
                  hovData: undefined, 
                  hoverCoords: undefined, 
                  hoverObj: undefined 
                })
              },
              
            }}
          />
        </div>}
    </>



    return <Window
      w={w} 
      getMenu={this.getMenu} 
    >{content}</Window>;
  }
}


export const wrapFilterIfJoined = <F extends AnyObject | undefined>(filter: F, path: ParsedJoinPath[] | undefined, rootTable: string): F extends AnyObject? AnyObject : undefined => {
  const joinPath = path?.length? reverseParsedPath(path, rootTable) : undefined;
  if(filter === undefined) return filter as any;

  if(joinPath){
    return {
      $existsJoined: {
        filter,
        path: joinPath,
      }
    } as any
  }

  return filter as any;
}