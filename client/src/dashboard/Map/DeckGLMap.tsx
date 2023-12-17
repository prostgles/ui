import DeckGL from '@deck.gl/react/typed';
import { RGBAColor } from 'deck.gl';
import React from "react";
import RTComp from "../RTComp";

 
import { Layer, WebMercatorViewport } from '@deck.gl/core/typed';
import { GeoJsonLayer } from '@deck.gl/layers/typed';

import { isDefined } from "prostgles-types";
import { pickKeys } from "../../utils";
import { MAP_PROJECTIONS } from "../W_Map/W_MapMenu";
import { DeckGLFeatureEditor, DeckGLFeatureEditorProps } from "./DeckGLFeatureEditor";
import "./DeckGLMap.css";
import DeckWrapped, { Bounds } from "./DeckGLWrapped";
import MapMenu from "./MapMenu";
import { makeImageLayer, makeTileLayer } from "./mapUtils";

export type Extent = [number, number, number, number];

type OnClickEvent = {
  coordinate?: [number, number];
  devicePixel: any;
  index: number;
  layer: any;
  picked: boolean;
  pixel: [number, number];
  pixelRatio: undefined
  viewport: any;
  x: number;
  y: number;
  object?: Record<string, any>;
} 

// import {_SunLight as SunLight, LightingEffect } from '@deck.gl/core';
// const le = new LightingEffect({ 
//   sunlight: new SunLight({
//     timestamp: 1610455406000, 
//     color: [255, 0, 0],
//     intensity: 1,
//     _shadow: true
//   })
// });

/* global window */
const devicePixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

// source: Natural Earth http://www.naturalearthdata.com/ via geojson.xyz
// const COUNTRIES = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson'; //eslint-disable-line
// const AIR_PORTS = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson';

export type Point = [number, number]

// export type GeoJSONFeature = {
//   type: 'Feature',
//   geometry:
//   | {
//     type: "Point";
//     coordinates: Point;
//   }
//   | {
//     type: "LineString"
//     coordinates: Point[];
//   }
//   | {
//     type: "MultiLineString" | "Polygon"
//     coordinates: Point[][];
//   };
//   properties?: any | undefined,
//   id?: number | string | undefined;
// };
import { Feature } from "@nebula.gl/edit-modes";
import { MapExtent } from "../Dashboard/dashboardUtils";
export type GeoJSONFeature = Feature;

export type GeoJsonLayerProps = {
  id: string;
  features: GeoJSONFeature[];
  filled: boolean;
  fillColor?: RGBAColor | ((f: any) => RGBAColor);
  lineColor?: RGBAColor | ((f: any) => RGBAColor);
  elevation?: number;
  pickable?: boolean;
  stroked?: boolean;
  onClick?: (info: any) => any;
  dataSignature: string;
  getLineWidth?: (f: any) => number;
  lineWidth?: number;
  layerColor?: number[];
}

export type MapState = {
  latitude: number;
  longitude: number;
  zoom: number;
  extent: Extent;
  target?: [number, number, number];
  basemap: {
    opacity: number;
    tileURLs: string[];
  },
  dataOpacity: number;
  pitch: number;
  bearing: number;
  mouseDown: boolean;
};

export type MapHandler = {
  fitBounds: (ext: MapExtent) => any;
  getExtent: () => MapExtent;
  deck: DeckWrapped;
}

export type HoverCoords = {
  x: number; y: number; 
  screenCoordinates?: [number, number];
  coordinates?: [number, number];
}

export type DecKGLMapProps = {
  initialState?: MapState;
  geoJsonLayers?: GeoJsonLayerProps[];
  /**
   * Used to identify when auto-zoom needs to be triggered
   */
  geoJsonLayersDataFilterSignature: string;
  onLoad?: (map: MapHandler) => void;
  onHover?: (object?: any, coords?: HoverCoords) => any;
  onPointerMove?: (coords?: HoverCoords) => any;
  onMapStateChange?: (state: MapState) => any;
  mapStateChangeDebounce?: number;

  /**
   * Must return:
   * [
   *    [minLng, minLat],
   *    [maxLng, maxLat]
   * ]
   */
  onGetFullExtent: (fromUserClick?: boolean) => Promise<MapExtent | undefined>;

  onClick?: (args: OnClickEvent) => any;
  tileURLs?: string[];
  tileSize?: number;
  tileAttribution?: {
    title: string;
    url: string;
  }

  options: {
    filterExtent?: boolean;
  }

  onOptionsChange: (newOpts: Partial<DecKGLMapProps["options"]>) => any;
  projection?: typeof MAP_PROJECTIONS[number];
  topLeftContent?: React.ReactNode;
  basemapImage?: {
    url: string;
    bounds: Extent;
  }

  edit: undefined | DeckGLFeatureEditorProps["edit"];
}

const vstateDebounce = 300;

export type DeckGLMapState = {
  basemap: {
    opacity: number;
    desaturate: number;
  },
  dataOpacity: number;
  initialView: {
    target: number[];
    latitude: number;
    longitude: number;
    zoom: number;
    bearing: number;
    pitch: number;
  },
  mouseDown: boolean;
  autoZoom: boolean;
  showCursorCoords: boolean;
  cursorCoords?: string;

  editFeature?: GeoJSONFeature;
}

type D = {
  editedFeaturesLayer?: Layer;
}

export class DeckGLMap extends RTComp<DecKGLMapProps, DeckGLMapState, D> {

  state: DeckGLMapState = {
    basemap: {
      opacity: .2,
      desaturate: 0,
    },
    dataOpacity: .5,
    initialView: {
      target: [1,1,0],
      latitude: 51.47,
      longitude: 0.45,
      zoom: 4,
      bearing: 0,
      pitch: 0
    },
    mouseDown: false,
    autoZoom: true,
    showCursorCoords: false, 
  }

  ref?: typeof DeckGL;
  refRoot?: HTMLDivElement;
  refCursor?: HTMLDivElement;
  rootResizeObserver?: ResizeObserver;

  dataExtent?: [[number, number], [number, number]];

  
  onDelta = (dP, dS: Partial<DeckGLMapState>, dD: Partial<D>) => {
    // console.log(dP, dS)

    if (dP?.geoJsonLayersDataFilterSignature && this.state.autoZoom && this.deckW) {
      this.fitBounds()
    }

    /** Init */
    if (this.refRoot && !this.rootResizeObserver) {
      this.rootResizeObserver = new ResizeObserver(() => {
        if (this._rootSizeKey !== this.rootSizeKey) {
          this.forceUpdate();
          this._rootSizeKey = this.rootSizeKey
        }
      })
      this.rootResizeObserver.observe(this.refRoot);

      const { projection = "mercator", initialState: _initialState } = this.props;
      

      this.deckW = new DeckWrapped(this.refRoot, { 
        initialViewState: _initialState as any,
        type: projection, 
        onLoad: () => {
          
          this.props.onLoad?.({
            deck: this.deckW!,
            fitBounds: this.fitBounds,
            getExtent: () => {
              const ext = this.deckW!.getExtent();
              if(!ext) return;
              return [ext.slice(0,2), ext.slice(2)] as any;
            }
          })
        },
        onViewStateChange: (viewState, bounds) => {
          
          const extent = bounds.flat();
          const parsedViewState = projection === "orthographic"? pickKeys(viewState, ["target", "zoom", "extent"]) : pickKeys(viewState, ["latitude", "longitude", "bearing", "pitch", "zoom"]);
          const newMapState = { ...parsedViewState, extent };
          
          this.props.onMapStateChange?.(newMapState as any)
        },
        onClickQuick: e => this.props.onClick?.(e as any),
        onHoverItem: (obj, coords) => {
          this.props.onHover?.(obj, coords)
        },
        onHover: e => {
          if(this.state.showCursorCoords && this.refCursor){
            this.refCursor.innerText = `${e.coordinate?.map(v => v.toString().padStart(3, "0")).join("\n")}`;
          }
          this.props.onPointerMove?.({ ...e, coordinates: e.coordinate as any, screenCoordinates: e.pixel })
        },
        layers: this.getLayers(),
      });
      
    }

    const eLayer = this.d.editedFeaturesLayer as any;
    if(this.deckW && (dP?.geoJsonLayers && this.props.geoJsonLayers || dS.dataOpacity  || dS.basemap || dD.editedFeaturesLayer)){
      this.deckW.render({
        ...(eLayer?.getCursor && {
          getCursor: eLayer?.getCursor?.bind(eLayer),
        }),
        layers: this.getLayers()
      });
    }
  }

  _rootSizeKey = ""
  get rootSizeKey(): string {
    return `${this.refRoot?.offsetWidth}.${this.refRoot?.offsetHeight}`;
  }

  onUnmount(): void {
    this.rootResizeObserver?.unobserve(this.refRoot!);
  }

  fitBounds = async (ext?: MapExtent) => {
    const { projection } = this.props;
    const dataExtent = await this.props.onGetFullExtent();
    if ( !dataExtent) { //} || (dataExtent || []).filter(v => Array.isArray(v) && !v.flat().some(_v => typeof _v !== "number") ).length !== 4) {
      return;
    }

    const limitedExtent: Bounds = projection === "orthographic"? dataExtent : [
      [
        Math.max(dataExtent[0][0], -179.9),
        Math.max(dataExtent[0][1], -89.9)
      ],
      [
        Math.min(dataExtent[1][0], 179.9),
        Math.min(dataExtent[1][1], 89.9)
      ]
    ]

    this.deckW?.zoomTo(limitedExtent);
  }

  viewStateDebounce: any;
  onViewStateChange(viewState) {
    const { onMapStateChange, mapStateChangeDebounce = vstateDebounce, projection } = this.props;
    if (!this.transitioning && onMapStateChange && viewState) {

      if (this.viewStateDebounce) window.clearTimeout(this.viewStateDebounce);
      this.viewStateDebounce = setTimeout(() => {

        if (projection === "orthographic") {

          onMapStateChange({
            ...viewState
          });
        } else {

          const viewport = new WebMercatorViewport(viewState);

          const nw = viewport.unproject([0, 0]);
          const se = viewport.unproject([viewport.width, viewport.height]);

          const sw = [nw[0], se[1]],
            ne = [se[0], nw[1]];

          onMapStateChange({
            ...viewState,
            extent: [...sw, ...ne]
          });
        }

        this.viewStateDebounce = null;
      }, mapStateChangeDebounce)

    }
  }
  transitioning?: boolean;
  currHoverObject: any;
  isHovering = false;
  mouseDown = false;

  getLayers = () => {
    const { basemap, dataOpacity = 1 } = this.state;
    const { geoJsonLayers = [], tileURLs, tileSize, projection = "mercator", basemapImage } = this.props;

    const dataLayers = geoJsonLayers.map(g => new GeoJsonLayer<GeoJSONFeature>({
      id: g.id,
      data: ({
        type: "FeatureCollection",
        features: g.features
      } as any),
      filled: true,
      pointRadiusMinPixels: 2,
      pointRadiusScale: 1,
      // pointType: 'circle',
      getPointRadius: f => f.properties?.radius ?? 1,
      extruded: Boolean(g.elevation),
      getElevation: g.elevation || 0,

      getFillColor: f => f.properties?.fillColor || g.fillColor || [200, 0, 80, 255],
      getLineColor: f => f.properties?.lineColor || g.lineColor || [200, 0, 80, 255],
      lineWidthMinPixels: 2,
      //@ts-ignore
      widthScale: 22,
      // getLineWidth: f => f.properties?.lineWidth ?? 4,
      lineWidth: f => f.properties?.lineWidth ?? 1,

      pickable: true,
      pickingRadius: 10,
      autoHighlight: true,
      onClick: g.onClick,
      // onHover: (d, e) => [d, e],
      opacity: dataOpacity,
      // material: {
      //   ambient: 0.35,
      //   diffuse: 0.6,
      //   shininess: 32,
      //   specularColor: [30, 30, 30]
      // }
    }));

    const tileLayers = projection === "mercator" ? [makeTileLayer({
      ...basemap,
      tileURLs,
      tileSize
    })] : basemapImage ? [makeImageLayer(basemapImage.url, basemapImage.bounds, basemap.opacity, basemap.desaturate)] : []

    return [
      ...tileLayers,
      ...dataLayers,
      this.d.editedFeaturesLayer
    ].filter(isDefined);
  }

  deckW?: DeckWrapped;
  render() {
    const { tileAttribution, options, onOptionsChange, topLeftContent } = this.props;
    const { basemap, dataOpacity = 1, showCursorCoords, autoZoom } = this.state;
 
    return (
      <div className="relative flex-row f-1"
        
        style={{
          overscrollBehavior: "contain"
        }}
        onMouseDown={() => {
          // this.setState({ mouseDown: true });
          this.mouseDown = true;
        }}
        onMouseUp={() => {
          // this.setState({ mouseDown: false })
          this.mouseDown = false;
        }}
      >
        {showCursorCoords && <div ref={e => { if(e) this.refCursor = e; }} className="absolute bg-0 rounded p-p25" style={{ bottom: 0, left: 0, zIndex: 1 }} > </div>}

        {tileAttribution?.title &&
          <div className="text-ellipsis noselect rounded font-14"
            style={{
              position: "absolute", right: 0, bottom: 0,
              maxHeight: "1.5em", zIndex: 1,
              backdropFilter: "blur(6px)", padding: "4px"  // background: "#f0f8ff9e", 
            }}>
            <a href={tileAttribution.url} target="_blank">{tileAttribution.title}</a>
          </div>
        }

        <div 
          className="MapTopLeftControls ai-start flex-col gap-1 absolute ai-center jc-center" 
          style={{ top: "1em", left: "1em", zIndex: 1 }}
        >

          {this.props.edit && <DeckGLFeatureEditor 
            edit={this.props.edit} 
            onRenderLayer={editedFeaturesLayer => {
              this.setData({ editedFeaturesLayer });
            }}
          />}
          {topLeftContent}
        </div>

        <div ref={e => { if (e) this.refRoot = e; }}></div>

        <MapMenu 
          autoZoom={autoZoom} 
          basemap={basemap} 
          dataOpacity={dataOpacity} 
          onAutoZoomChange={autoZoom => this.setState({ autoZoom })} 
          onBaseMapChange={basemap => this.setState({ basemap })} 
          onDataOpacityChange={dataOpacity => this.setState({ dataOpacity })} 
          onFitBounds={this.fitBounds}
          onOptionsChange={onOptionsChange}
          options={options}
          cursorCoords={{
            show: showCursorCoords,
            onChange: showCursorCoords => {
              this.setState({ showCursorCoords })}
          }}
        />
      </div>
    )

  }
}





