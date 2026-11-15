import type { MVTLayerProps } from "deck.gl";
import type { Feature } from "geojson";
import type { DeckGlLibs } from "../DeckGLWrapped";
import { getText, MVT_LABEL_FONT } from "./MVTLayerProps";

type TileRenderProps = Parameters<
  NonNullable<MVTLayerProps["renderSubLayers"]>
>[0];

export const renderMVTSubLayers = (
  props: TileRenderProps,
  { lib, extensions }: DeckGlLibs,
) => {
  const { data, ...layerProps } = props;
  const features = data as Feature[];

  return MVT_RENDER_GROUPS.flatMap(({ id, layerNames }) => {
    const groupFeatures = features.filter((feature) =>
      layerNames.some(
        (layerName) => layerName === feature.properties?.layerName,
      ),
    );
    if (!groupFeatures.length) return [];

    return new lib.GeoJsonLayer(layerProps, {
      id: `${props.id}-${id}`,
      data: id === "labels" ? getLabelFeatures(groupFeatures) : groupFeatures,
      ...(id === "labels" && {
        textCharacterSet: "auto",
        textFontFamily: MVT_LABEL_FONT.family,
        textFontWeight: MVT_LABEL_FONT.weight,
        textFontSettings: { sdf: true },
        textOutlineColor: [255, 255, 255],
        textOutlineWidth: 3,
        getTextAngle: (feature: Feature) =>
          Number(feature.properties?.labelAngle ?? 0),
        parameters: { depthCompare: "always", depthWriteEnabled: false },
      }),
      _subLayerProps: {
        ...(id === "labels" && {
          "points-text": {
            type: lib.CollisionFilteredTextLayer,
            background: true,
            collisionPriority: 0,
          },
        }),
        "polygons-stroke": {
          widthUnits: "pixels",
          widthMinPixels: 0,
          getWidth: 0.8,
        },
        ...(id === "ferries" && {
          linestrings: {
            extensions: [
              ...(props.extensions ?? []),
              new extensions.PathStyleExtension({ dash: true }),
            ],
            widthUnits: "pixels",
            getWidth: 1,
            getDashArray: [8, 6],
          },
        }),
      },
    });
  });
};

/* Draw water routes below bridge decks, and station roofs above their tracks. */
const MVT_RENDER_GROUPS = [
  { id: "land", layerNames: ["land", "sites"] },
  { id: "water-lines", layerNames: ["water_lines"] },
  { id: "water", layerNames: ["ocean", "water_polygons"] },
  { id: "ferries", layerNames: ["ferries"] },
  {
    id: "structures",
    layerNames: [
      "pier_lines",
      "pier_polygons",
      "dam_lines",
      "dam_polygons",
      "street_polygons",
      "bridges",
    ],
  },
  { id: "streets", layerNames: ["streets", "boundaries", "aerialways"] },
  { id: "buildings", layerNames: ["buildings"] },
  {
    id: "labels",
    layerNames: [
      "place_labels",
      "water_polygons_labels",
      "boundary_labels",
      "street_labels_points",
      "street_labels",
      "streets_polygons_labels",
      "public_transport",
    ],
  },
];

export const MVT_LAYERS = MVT_RENDER_GROUPS.flatMap(
  ({ layerNames }) => layerNames,
);

const getLabelFeatures = (features: Feature[]) => {
  const placeLabelKeys = new Set<string>();
  return features.filter((feature) => {
    if (!getText(feature)) return false;
    if (feature.geometry.type === "Point") {
      const [x = 0, y = 0] = feature.geometry.coordinates;
      if (x < 0 || x >= 1 || y < 0 || y >= 1) return false;
    }
    const { layerName, kind, name, population } = feature.properties ?? {};
    if (layerName !== "place_labels" || !population) return true;

    /* The tiles can contain both a settlement node and its boundary label. */
    const placeLabelKey = JSON.stringify([kind, name, population]);
    if (placeLabelKeys.has(placeLabelKey)) return false;
    placeLabelKeys.add(placeLabelKey);
    return true;
  });
};
