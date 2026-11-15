import { MVTLayer } from "deck.gl";
import type { AccessorFunction, GeoJsonLayer, Layer, Viewport } from "deck.gl";
import type { Feature } from "geojson";
import { getText, getTextSize, MVT_LABEL_FONT } from "./MVTLayerProps";
import { getLabelBounds, type LabelBounds } from "./labelCollision";
import { getStreetLabel } from "./getStreetLabel";

export class MVTBasemapLayer extends MVTLayer {
  static layerName = "MVTBasemapLayer";

  renderLayers() {
    super.renderLayers();
    const { viewport } = this.context;
    const { tileset } = this.state;
    const labelLayers: GeoJsonLayer[] = [];
    const geometryLayers: Layer[] = [];
    const candidates: LabelCandidate[] = [];
    for (const tile of tileset?.tiles ?? []) {
      for (const layer of tile.layers ?? []) {
        if (!layer.id.endsWith("-labels")) {
          geometryLayers.push(layer);
          continue;
        }
        if (!tile.isVisible) continue;
        labelLayers.push(layer as GeoJsonLayer);
        const project = (coordinates: number[]) =>
          projectTilePoint(coordinates, tile.index, viewport);
        for (const sourceFeature of layer.props.data as Feature[]) {
          const text = getText(sourceFeature);
          if (!text) continue;
          const size = getTextSize(sourceFeature);
          const width = getLabelWidth(text) * size;
          const feature =
            sourceFeature.geometry.type === "Point" ?
              sourceFeature
            : getStreetLabel(sourceFeature, project, viewport, width, size);
          if (feature?.geometry.type !== "Point") continue;
          const bounds = getLabelBounds(
            project(feature.geometry.coordinates),
            width,
            size * 1.2,
            viewport,
            Number(feature.properties?.labelAngle ?? 0),
          );
          if (!bounds) continue;
          candidates.push({ layerId: layer.id, feature, bounds, size, text });
        }
      }
    }

    candidates.sort(
      (first, second) =>
        second.size - first.size ||
        Number(second.feature.properties?.population ?? 0) -
          Number(first.feature.properties?.population ?? 0) ||
        first.text.localeCompare(second.text) ||
        first.bounds.left - second.bounds.left ||
        first.bounds.top - second.bounds.top,
    );
    const visibleLabels = new Map<string, Feature[]>();
    for (const { layerId, feature } of candidates) {
      const features = visibleLabels.get(layerId) ?? [];
      features.push(feature);
      visibleLabels.set(layerId, features);
    }

    /* Labels from every tile must be drawn above all basemap geometry. */
    return [
      geometryLayers,
      labelLayers.map((layer) => {
        const features = visibleLabels.get(layer.id) ?? [];
        const getCollisionPriority: AccessorFunction<unknown, number> = (
          _label,
          { index },
        ) => Number(features[index]?.properties?.population ?? 0);
        return layer.clone({
          data: features,
          _subLayerProps: {
            ...layer.props._subLayerProps,
            "points-text": {
              ...layer.props._subLayerProps?.["points-text"],
              getCollisionPriority,
            },
          },
        });
      }),
    ];
  }
}

type LabelCandidate = {
  layerId: string;
  feature: Feature;
  bounds: LabelBounds;
  size: number;
  text: string;
};

const labelContext = document.createElement("canvas").getContext("2d")!;
labelContext.font = `${MVT_LABEL_FONT.weight} 64px ${MVT_LABEL_FONT.family}`;
const characterWidths = new Map<string, number>();
const getLabelWidth = (text: string) =>
  Array.from(text).reduce((total, character) => {
    let width = characterWidths.get(character);
    if (width === undefined) {
      /* Match deck.gl's per-character advances, without canvas kerning. */
      width = labelContext.measureText(character).width / 64;
      characterWidths.set(character, width);
    }
    return total + width;
  }, 0);

const projectTilePoint = (
  coordinates: number[],
  tile: { x: number; y: number; z: number },
  viewport: Viewport,
) => {
  const [tileX = 0, tileY = 0] = coordinates;
  const longitude = ((tile.x + tileX) / 2 ** tile.z) * 360 - 180;
  const latitude =
    (Math.atan(
      Math.sinh(Math.PI * (1 - (2 * (tile.y + tileY)) / 2 ** tile.z)),
    ) *
      180) /
    Math.PI;
  return viewport.project([longitude, latitude]);
};
