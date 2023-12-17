
import { COORDINATE_SYSTEM } from '@deck.gl/core';

import GL from '@luma.gl/constants'; 
import { BitmapLayer, PathLayer, TileLayerProps } from "deck.gl/typed";
import { Extent } from "./DeckGLMap";
import { GeoBoundingBox, TileLayer, _Tileset2D } from "@deck.gl/geo-layers/typed";



// Stamen Design

export const DEFAULT_TILE_URLS = [
  // 'http://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg'
  // http://stamen-tiles-c.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg

  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
];

export function makeTileLayer(
  {
    opacity = 1,
    desaturate = 22,
    tileURLs = DEFAULT_TILE_URLS,
    onTilesLoad = undefined,
    showBorder = false,
    tileSize = 256, // 256 / devicePixelRatio; // or 512

    asMVT = false
  } = {},

) {

  if (!Array.isArray(tileURLs) || !tileURLs.find(url => typeof url === "string")) {
    tileURLs = DEFAULT_TILE_URLS;
  }

  return new TileLayer({
    id: "basemap",
    TilesetClass: _Tileset2D,
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


    renderSubLayers: props => {
      const {
        bbox: { west, south, east, north }
      } = (props.tile as { bbox: GeoBoundingBox });

      return [
        new BitmapLayer(props, {
          data: undefined, // null
          image: props.data,
          bounds: [west, south, east, north],
        }),
        showBorder &&
        new PathLayer({
          id: `${props.id}-border`,
          visible: props.visible,
          data: [[[west, north], [west, south], [east, south], [east, north], [west, north]]],
          getPath: d => d,
          getColor: [255, 0, 0],
          widthMinPixels: 4
        })
      ];
    }
  } as TileLayerProps);
} 

export function makeImageLayer(url: string, bounds: Extent, opacity = 1, desaturate = 0, sharpImage = false) {
  return new BitmapLayer({
    opacity,
    transparentColor: [255, 255, 255, 255],
    desaturate,
    id: 'bitmap-layer',
    bounds,
    image: url,

    /** To remove smoothing and achieve a pixelated appearance: */
    textureParameters: !sharpImage? undefined : {
      [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
      [GL.TEXTURE_MAG_FILTER]: GL.NEAREST
    },

    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
  });

}



