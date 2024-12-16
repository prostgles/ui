import type { OrthographicViewState } from "deck.gl";
import type { Bounds } from "./DeckGLWrapped";

export function fitBounds(options: {
  width: number;
  height: number;
  padding: number;
  bounds: Bounds;
  minExtent?: number;
  maxZoom?: number;
  offset?: [number, number];
}): OrthographicViewState {
  const {
    width = 1,
    height = 1,
    bounds,
    minExtent = 0,
    maxZoom = 24,
    offset = [0, 0],
  } = options;
  const [[west, south], [east, north]] = bounds;
  const padding = getPaddingObject(options.padding);
  const nw = [west, north] as const; // lngLatToWorld([west, clamp(north, -MAX_LATITUDE, MAX_LATITUDE)]);
  const se = [east, south] as const; // lngLatToWorld([east, clamp(south, -MAX_LATITUDE, MAX_LATITUDE)]);
  const size = [
    Math.max(Math.abs(se[0] - nw[0]), minExtent),
    Math.max(Math.abs(se[1] - nw[1]), minExtent),
  ] as const;
  const targetSize = [
    width - padding.left - padding.right - Math.abs(offset[0]) * 2,
    height - padding.top - padding.bottom - Math.abs(offset[1]) * 2,
  ] as const;

  const scaleX = targetSize[0] / size[0];
  const scaleY = targetSize[1] / size[1];
  const offsetX = (padding.right - padding.left) / 2 / scaleX;
  const offsetY = (padding.top - padding.bottom) / 2 / scaleY;
  const center: [number, number] = [
    (se[0] + nw[0]) / 2 + offsetX,
    (se[1] + nw[1]) / 2 + offsetY,
  ];

  const zoom = Math.min(maxZoom, Math.log2(Math.abs(Math.min(scaleX, scaleY))));

  return {
    target: center,
    zoom,
    // extent: bounds
  };
}

function getPaddingObject(padding = 0) {
  if (typeof padding === "number") {
    return {
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
    };
  }

  return padding;
}
