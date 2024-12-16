import React from "react";
import RTComp from "../RTComp";

import { isDefined } from "prostgles-types";
import type { MAP_PROJECTIONS } from "../W_Map/W_MapMenu";
import type { DeckGLFeatureEditorProps } from "./DeckGLFeatureEditor";
import "./DeckGLMap.css";
import type { Bounds, DeckGlLibs } from "./DeckGLWrapped";
import { DeckWrapped, getDeckLibs, getViewState } from "./DeckGLWrapped";
import { makeImageLayer, makeTileLayer } from "./mapUtils";

export type Extent = [number, number, number, number];

type OnClickEvent = {
  coordinate?: [number, number];
  devicePixel: any;
  index: number;
  layer: any;
  picked: boolean;
  pixel: [number, number];
  pixelRatio: undefined;
  viewport: any;
  x: number;
  y: number;
  object?: Record<string, any>;
};

// import {_SunLight as SunLight, LightingEffect } from 'deck.gl';
// const le = new LightingEffect({
//   sunlight: new SunLight({
//     timestamp: 1610455406000,
//     color: [255, 0, 0],
//     intensity: 1,
//     _shadow: true
//   })
// });

/* global window */
// const devicePixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

// source: Natural Earth http://www.naturalearthdata.com/ via geojson.xyz
// const COUNTRIES = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson'; //eslint-disable-line
// const AIR_PORTS = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson';

export type Point = [number, number];

import type { GeoJsonLayer } from "deck.gl";
import type { Feature } from "geojson";
import type { MapExtent } from "../Dashboard/dashboardUtils";
import type { MAP_SELECT_COLUMNS } from "../W_Map/getMapData";
import { InMapControls } from "./InMapControls";

export type DeckGlColor =
  | [number, number, number]
  | [number, number, number, number];

export type GeoJSONFeature = Omit<Feature, "properties"> & {
  properties: (
    | {
        type?: undefined;
        _is_from_osm?: boolean;
      }
    | {
        type: "table";
        [MAP_SELECT_COLUMNS.idObj]: any;
        [MAP_SELECT_COLUMNS.geoJson]: any;
      }
    | {
        type: "sql";
        $rowhash: string;
      }
  ) & {
    radius?: number;
  };
};

export type GeoJsonLayerProps = {
  id: string;
  features: GeoJSONFeature[];
  filled: boolean;
  getFillColor: (f: GeoJSONFeature) => DeckGlColor;
  getLineColor: (f: GeoJSONFeature) => DeckGlColor;
  getText?: (f: GeoJSONFeature) => string;
  getTextSize?: number | ((f: GeoJSONFeature) => number);
  getIcon?: (f: GeoJSONFeature) => {
    url: string;
    width: number;
    height: number;
  };
  elevation?: number;
  pickable?: boolean;
  stroked?: boolean;
  onClick?: (info: any) => any;
  dataSignature: string;
  getLineWidth?: (f: any) => number;
  lineWidth?: number;
  layerColor?: DeckGlColor;
};

export type MapState = {
  latitude: number;
  longitude: number;
  zoom: number;
  extent: Extent;
  target?: [number, number, number];
  basemap: {
    opacity: number;
    tileURLs: string[];
  };
  dataOpacity: number;
  pitch: number;
  bearing: number;
  mouseDown: boolean;
};

export type MapHandler = {
  fitBounds: (ext: MapExtent) => any;
  getExtent: () => MapExtent;
  deck: DeckWrapped;
};

export type HoverCoords = {
  x: number;
  y: number;
  screenCoordinates?: [number, number];
  coordinates?: [number, number];
};
export const MapExtentBehavior = [
  {
    key: "autoZoomToData",
    label: "Follow data",
    subLabel: "Will zoom to data extent on data change",
  },
  {
    key: "filterToMapBounds",
    label: "Follow map",
    subLabel: "Filters data to map bounds",
  },
  {
    key: "freeRoam",
    label: "Free roam",
    subLabel: "Map bounds filter not applied",
  },
] as const;

export type MapExtentBehavior = (typeof MapExtentBehavior)[number]["key"];

export type DecKGLMapProps = {
  basemapOpacity: number;
  basemapDesaturate: number;
  dataOpacity: number;
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
  };

  options: {
    extentBehavior?: "autoZoomToData" | "filterToMapBounds" | "freeRoam";
  };

  onOptionsChange: (newOpts: Partial<DecKGLMapProps["options"]>) => any;
  projection?: (typeof MAP_PROJECTIONS)[number];
  topLeftContent?: React.ReactNode;
  basemapImage?: {
    url: string;
    bounds: Extent;
  };

  edit: undefined | DeckGLFeatureEditorProps["edit"];
};

const vstateDebounce = 300;

export type DeckGLMapState = {
  initialView: {
    target: number[];
    latitude: number;
    longitude: number;
    zoom: number;
    bearing: number;
    pitch: number;
  };
  mouseDown: boolean;
  cursorCoords?: string;

  editFeature?: GeoJSONFeature;
};

type D = {
  editedFeaturesLayer?: GeoJsonLayer;
};

export type DeckGLMapDivDemoControls = HTMLDivElement & {
  getLatLngXY: (place: { latitude: number; longitude: number }) => {
    x: number;
    y: number;
  };
  zoomTo: (place: {
    latitude: number;
    longitude: number;
    zoom: number;
  }) => void;
};

const setDemoHandles = (node: HTMLDivElement, dmap: DeckGLMap) => {
  (node as DeckGLMapDivDemoControls).getLatLngXY = (place: {
    latitude: number;
    longitude: number;
  }) => {
    const [x = 0, y = 0] = dmap
      .deckW!.deck.getViewports()![0]!
      .project([place.longitude, place.latitude]);
    const bbox = node.getBoundingClientRect();
    return {
      x: bbox.x + x, //   -.1456
      y: bbox.y + y, //   51.526
    };
  };
  (node as DeckGLMapDivDemoControls).zoomTo = (place: {
    latitude: number;
    longitude: number;
    zoom: number;
  }) => {
    dmap.deckW?.zoomTo({ type: "point", ...place });
  };
  node.classList.toggle("DeckGLMapDiv", true);
};

export class DeckGLMap extends RTComp<DecKGLMapProps, DeckGLMapState, D> {
  state: DeckGLMapState = {
    initialView: {
      target: [1, 1, 0],
      latitude: 51.47,
      longitude: 0.45,
      zoom: 4,
      bearing: 0,
      pitch: 0,
    },
    mouseDown: false,
  };

  ref?: typeof import("deck.gl");
  refRoot?: HTMLDivElement;
  refCursor?: HTMLDivElement;
  rootResizeObserver?: ResizeObserver;

  dataExtent?: [[number, number], [number, number]];
  deckGlLibs?: DeckGlLibs;
  onDelta = async (
    dP: Partial<DecKGLMapProps> | undefined,
    dS: Partial<DeckGLMapState> = {},
    dD: Partial<D> = {},
  ) => {
    if (
      dP?.geoJsonLayersDataFilterSignature &&
      this.props.options.extentBehavior === "autoZoomToData" &&
      this.deckW
    ) {
      this.fitBounds();
    }

    /** Init */
    if (this.refRoot && !this.rootResizeObserver) {
      this.rootResizeObserver = new ResizeObserver(() => {
        if (this._rootSizeKey !== this.rootSizeKey && this.mounted) {
          this.forceUpdate();
          this._rootSizeKey = this.rootSizeKey;
        }
      });
      setDemoHandles(this.refRoot, this);
      this.rootResizeObserver.observe(this.refRoot);

      const { projection = "mercator", initialState: _initialState } =
        this.props;
      this.deckGlLibs = await getDeckLibs();
      this.deckW = new DeckWrapped(
        this.refRoot,
        {
          initialViewState: _initialState as any,
          type: projection,
          onLoad: () => {
            this.props.onLoad?.({
              deck: this.deckW!,
              fitBounds: this.fitBounds,
              getExtent: () => {
                const ext = this.deckW!.getExtent();
                if (!ext) return;
                return [ext.slice(0, 2), ext.slice(2)] as any;
              },
            });
          },
          onViewStateChange: (viewState, bounds) => {
            const extent = bounds.flat();
            const parsedViewState = getViewState(projection, viewState);
            const newMapState = { ...parsedViewState, extent };

            this.props.onMapStateChange?.(newMapState as any);
          },
          onClickQuick: (e) => this.props.onClick?.(e as any),
          onHoverItem: (obj, coords) => {
            this.props.onHover?.(obj, coords);
          },
          onHover: (e) => {
            this.props.onPointerMove?.({
              ...e,
              coordinates: e.coordinate as any,
              screenCoordinates: e.pixel,
            });
          },
          layers: this.getLayers().layers,
        },
        this.deckGlLibs.lib,
      );
    }

    if (
      this.deckW &&
      ((dP?.geoJsonLayers && this.props.geoJsonLayers) ||
        dP?.dataOpacity ||
        dP?.basemapDesaturate ||
        dP?.basemapOpacity ||
        "editedFeaturesLayer" in dD)
    ) {
      this.deckW.render({
        layers: this.getLayers().layers,
      });
    }
  };

  _rootSizeKey = "";
  get rootSizeKey(): string {
    return `${this.refRoot?.offsetWidth}.${this.refRoot?.offsetHeight}`;
  }

  onUnmount(): void {
    this.rootResizeObserver?.unobserve(this.refRoot!);
  }

  fitBounds = async () => {
    const { projection } = this.props;
    const dataExtent = await this.props.onGetFullExtent();
    if (!dataExtent) {
      return;
    }

    const limitedExtent: Bounds =
      projection === "orthographic" ? dataExtent : (
        [
          [
            Math.max(dataExtent[0][0], -179.9),
            Math.max(dataExtent[0][1], -89.9),
          ],
          [Math.min(dataExtent[1][0], 179.9), Math.min(dataExtent[1][1], 89.9)],
        ]
      );

    this.deckW?.zoomTo(limitedExtent);
  };

  viewStateDebounce: any;
  onViewStateChange(viewState) {
    const {
      onMapStateChange,
      mapStateChangeDebounce = vstateDebounce,
      projection,
    } = this.props;
    const deckGlLibs = this.deckGlLibs;
    if (!this.transitioning && onMapStateChange && viewState && deckGlLibs) {
      if (this.viewStateDebounce) window.clearTimeout(this.viewStateDebounce);
      this.viewStateDebounce = setTimeout(() => {
        if (projection === "orthographic") {
          onMapStateChange({
            ...viewState,
          });
        } else {
          const viewport = new deckGlLibs.lib.WebMercatorViewport(viewState);

          const nw = viewport.unproject([0, 0]);
          const se = viewport.unproject([viewport.width, viewport.height]);

          const sw = [nw[0], se[1]],
            ne = [se[0], nw[1]];

          onMapStateChange({
            ...viewState,
            extent: [...sw, ...ne],
          });
        }

        this.viewStateDebounce = null;
      }, mapStateChangeDebounce);
    }
  }
  transitioning?: boolean;
  currHoverObject: any;
  isHovering = false;
  mouseDown = false;

  getLayers = () => {
    // const { basemap, dataOpacity = 1 } = this.state;
    const {
      geoJsonLayers = [],
      tileURLs,
      tileSize,
      projection = "mercator",
      basemapImage,
      dataOpacity,
      basemapDesaturate,
      basemapOpacity,
    } = this.props;
    const { deckGlLibs } = this;
    if (!deckGlLibs) return { layers: [], dataLayers: [], tileLayers: [] };

    const dataLayers = geoJsonLayers.map(
      (g) =>
        new deckGlLibs.lib.GeoJsonLayer<GeoJSONFeature["properties"]>({
          id: g.id,
          data: {
            type: "FeatureCollection",
            features: g.features,
          },
          /** Disabled due to bad experience (features missing) */
          // extensions: [new deckGlLibs.extensions.CollisionFilterExtension()],
          filled: true,

          /**
           * Radius of the circle in meters. If radiusUnits is not meters, this is converted from meters.
           */
          getPointRadius: (f) => f.properties.radius ?? 1,
          pointRadiusMinPixels: 2,
          pointRadiusScale: 1,

          extruded: Boolean(g.elevation),
          getElevation: g.elevation || 0,

          getFillColor: g.getFillColor, // ?? [200, 0, 80, 255],
          getLineColor: g.getLineColor, // ?? [200, 0, 80, 255],
          pointType: [
            "circle",
            g.getIcon ? "icon" : undefined,
            g.getText ? "text" : undefined,
          ]
            .filter(isDefined)
            .join("+"),
          getText: g.getText,
          getTextAlignmentBaseline: "top",
          getTextPixelOffset: (f) => [0, 5],
          getTextSize: g.getTextSize,
          textCharacterSet: "auto",
          /** For example, maxWidth: 10.0 used with getSize: 12 is roughly the equivalent of max-width: 120px in CSS. */
          textMaxWidth: 10,

          getIconColor: g.getFillColor,
          getIcon: g.getIcon,
          getIconPixelOffset: (f) => [0, -10],
          getIconSize: g.getIcon && ((f) => g.getIcon!(f).width),
          lineWidthMinPixels: 2,
          //@ts-ignore
          widthScale: 22,
          lineWidth: (f) => f.properties?.lineWidth ?? 1,

          pickable: true,
          pickingRadius: 10,
          autoHighlight: true,
          onClick: g.onClick,
          opacity: dataOpacity,
          // material: {
          //   ambient: 0.35,
          //   diffuse: 0.6,
          //   shininess: 32,
          //   specularColor: [30, 30, 30]
          // }
        }),
    );

    const tileLayers =
      !this.deckGlLibs ? []
      : projection === "mercator" ?
        [
          makeTileLayer(
            {
              opacity: basemapOpacity,
              desaturate: basemapDesaturate,
              tileURLs,
              tileSize,
            },
            this.deckGlLibs,
          ),
        ]
      : basemapImage ?
        [makeImageLayer({ ...basemapImage, deckGlLibs: this.deckGlLibs })]
      : [];

    const layers = [
      ...tileLayers,
      ...dataLayers,
      ...(this.d.editedFeaturesLayer ? [this.d.editedFeaturesLayer] : []),
    ];

    return {
      layers,
      tileLayers,
      dataLayers,
      geoJsonLayers,
    };
  };
  onRenderLayer = (editedFeaturesLayer: GeoJsonLayer<any, {}> | undefined) => {
    this.setData({ editedFeaturesLayer });
  };
  deckW?: DeckWrapped;
  render() {
    const { deckW, deckGlLibs } = this;
    return (
      <div
        className="relative flex-row f-1"
        style={{
          overscrollBehavior: "contain",
        }}
        onMouseDown={() => {
          this.mouseDown = true;
        }}
        onMouseUp={() => {
          this.mouseDown = false;
        }}
      >
        {deckW && deckGlLibs && (
          <InMapControls
            {...this.props}
            fitBounds={this.fitBounds}
            deckGlLibs={deckGlLibs}
            deckW={deckW}
            onRenderLayer={this.onRenderLayer}
          />
        )}
        <div
          ref={(e) => {
            if (e) this.refRoot = e;
          }}
        ></div>
      </div>
    );
  }
}
