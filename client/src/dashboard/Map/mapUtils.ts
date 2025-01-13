import type { Extent } from "./DeckGLMap";
import type { DeckGlLibs } from "./DeckGLWrapped";
import type { TileLayer, TileLayerProps } from "deck.gl";

export const DEFAULT_TILE_URLS = [
  // 'http://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg'
  // http://stamen-tiles-c.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg

  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
];

export function makeTileLayer(
  {
    opacity = 1,
    desaturate = 22,
    tileURLs = DEFAULT_TILE_URLS,
    onTilesLoad = undefined,
    showBorder = false,
    tileSize = 256, // 256 / devicePixelRatio; // or 512

    asMVT = false,
  } = {},
  deckGlLibs: DeckGlLibs,
): TileLayer {
  if (
    !Array.isArray(tileURLs) ||
    !tileURLs.find((url) => typeof url === "string")
  ) {
    tileURLs = DEFAULT_TILE_URLS;
  }

  if (tileURLs.some((url) => url.endsWith(".pbf") || url.endsWith(".mvt"))) {
    return new deckGlLibs.lib.MVTLayer({
      id: "basemap",
      data: tileURLs,
      loaders: [deckGlLibs.MVTLoader],
      loadOptions: {
        mvt: {
          // cp node_modules/@loaders.gl/mvt/dist/mvt-worker.js static/mvt-worker.js
          // Added file to express static
          workerUrl: "/mvt-worker.js",
        },
      },
      minZoom: 0,
      maxZoom: 14,
      getFillColor: (f) => {
        switch (f.properties.layerName) {
          case "poi":
            return [255, 0, 0];
          case "water":
            return [120, 150, 180];
          case "building":
            return [218, 218, 218];
          default:
            return [240, 240, 240];
        }
      },
      getLineWidth: (f) => {
        switch (f.properties.class) {
          case "street":
            return 6;
          case "motorway":
            return 10;
          default:
            return 1;
        }
      },
      getLineColor: [192, 192, 192],
      getPointRadius: 2,
      pointRadiusUnits: "pixels",
      stroked: false,
      // picking: true
    });
  }

  return new deckGlLibs.lib.TileLayer({
    id: "basemap",
    TilesetClass: deckGlLibs.lib._Tileset2D,
    opacity,

    desaturate,
    transparentColor: [255, 255, 255, 255],

    /**
     * https://www.trailnotes.org/FetchMap/TileServeSource.html
     * 
        https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{Y}/{X}.jpg
     */

    // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
    data: tileURLs,

    // Since these OSM tiles support HTTP/2, we can make many concurrent requests
    // and we aren't limited by the browser to a certain number per domain.
    maxRequests: 20,

    pickable: true,
    onViewportLoad: onTilesLoad,
    autoHighlight: showBorder,
    highlightColor: [60, 60, 60, 40],
    // https://wiki.openstreetmap.org/wiki/Zoom_levels
    minZoom: 0,
    maxZoom: 19,
    tileSize,

    renderSubLayers: (props) => {
      const {
        bbox: { west, south, east, north },
      } = props.tile as { bbox: any };

      return [
        new deckGlLibs.lib.BitmapLayer(props as any, {
          data: undefined, // null
          image: props.data,
          bounds: [west, south, east, north],
        }),
        showBorder &&
          new deckGlLibs.lib.PathLayer({
            id: `${props.id}-border`,
            visible: props.visible,
            data: [
              [
                [west, north],
                [west, south],
                [east, south],
                [east, north],
                [west, north],
              ],
            ],
            getPath: (d) => d,
            getColor: [255, 0, 0],
            widthMinPixels: 4,
          }),
      ];
    },
  } as TileLayerProps);
}

type MakeImageLayerArgs = {
  url: string;
  bounds: Extent;
  opacity?: number;
  desaturate?: number;
  sharpImage?: boolean;
  deckGlLibs: DeckGlLibs;
};
export function makeImageLayer({
  bounds,
  url,
  opacity = 1,
  desaturate = 0,
  sharpImage = false,
  deckGlLibs,
}: MakeImageLayerArgs) {
  //@ts-ignore
  const { GL } = deckGlLibs.luma;
  return new deckGlLibs.lib.BitmapLayer({
    opacity,
    transparentColor: [255, 255, 255, 255],
    desaturate,
    id: "bitmap-layer",
    bounds,
    image: url,

    /** To remove smoothing and achieve a pixelated appearance: */
    textureParameters:
      !sharpImage ? undefined : (
        {
          [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
          [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
        }
      ),

    coordinateSystem: deckGlLibs.lib.COORDINATE_SYSTEM.CARTESIAN,
  });
}
