import { mdiMapMarker, mdiShapePolygonPlus, mdiVectorPolyline } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { pickKeys } from "prostgles-types";
import type { GeoJSONFeature } from "./DeckGLMap";
// export type  { Feature } from "@deck.gl-community/editable-layers/dist/geojson-types";
// export type { EditableGeojsonLayerProps } from "@deck.gl-community/editable-layers/dist/editable-layers/editable-geojson-layer";
// import type { FeatureCollection, Geometry } from "@deck.gl-community/editable-layers";
// export type { EditableGeoJsonLayer } from "@deck.gl-community/editable-layers";
// export type { FeatureCollection, Geometry } from "@deck.gl-community/editable-layers";
// export type { EditableGeojsonLayerProps } from "./editable-layers/editable-layers/editable-geojson-layer";
// export type { FeatureCollection, Geometry, EditableGeoJsonLayer } from "./editable-layers/index";
// export type { Feature } from "./editable-layers/geojson-types";
// import type { FeatureCollection, Geometry } from "./editable-layers/index";

const ld = {
  ModifyMode: 1,
  EditableGeoJsonLayer: 1,
  DrawPointMode: 1,
  DrawLineStringMode: 1,
  DrawPolygonMode: 1,
  DrawPolygonByDraggingMode: 1,
  DrawRectangleMode: 1,
  DrawSquareMode: 1,
  DrawEllipseByBoundingBoxMode: 1,
};

const getNebulaLib = async () => {
  // const lib = await import(/* webpackChunkName: "editable_layers" */  "@deck.gl-community/editable-layers");
  const lib = ld; // await import(/* webpackChunkName: "editable_layers" */  "./editable-layers/index");
  return lib;
};

export type NebulaLib = Awaited<ReturnType<typeof getNebulaLib>>;

type DrawModes = NebulaLib;
const MODE_KEYS = [
  "EditableGeoJsonLayer",
  "DrawPointMode",
  "DrawLineStringMode",
  "DrawPolygonMode",
  "DrawRectangleMode",
  "DrawSquareMode",
  "DrawPolygonByDraggingMode",
  "DrawEllipseByBoundingBoxMode",
  "ModifyMode",
] as const satisfies (keyof Partial<DrawModes>)[];
export type AllDrawModes = Pick<DrawModes, (typeof MODE_KEYS)[number]>;

export const DrawModes = {
  DrawPointMode: { label: "Point", iconPath: mdiMapMarker },
  DrawLineStringMode: { label: "LineString", iconPath: mdiVectorPolyline },
  DrawPolygonMode: { label: "Polygon", iconPath: mdiShapePolygonPlus },
  // DrawPolygonByDraggingMode: { label: "Polygon Dragged", iconPath: mdiShapePolygonPlus },
  // DrawRectangleMode: { label: "Rectangle", iconPath: mdiRectangleOutline },
  // DrawSquareMode: { label: "Square", iconPath: mdiSquareOutline },
  // DrawEllipseByBoundingBoxMode: { label: "Ellipse", iconPath: mdiEllipseOutline },
} as const satisfies Partial<
  Record<
    keyof AllDrawModes,
    {
      label: string;
      iconPath: string;
    }
  >
>;

export const useDrawModes = () => {
  const res = usePromise(async () => {
    // const lib = await import("@deck.gl-community/editable-layers");
    const lib = await getNebulaLib();

    const modes = pickKeys(lib, MODE_KEYS);

    return { DrawModes, modes };
  }, []);

  return res;
};

export const NEBULA_GL_EDIT_TYPES = [
  "updateTentativeFeature",
  "movePosition", //: A position was moved.
  "addPosition", //: A position was added (either at the beginning, middle, or end of a feature's coordinates).
  "removePosition", //: A position was removed. Note: it may result in multiple positions being removed in order to maintain valid GeoJSON (e.g. removing a point from a triangular hole will remove the hole entirely).
  "addFeature", //: A new feature was added. Its index is reflected in featureIndexes
  "finishMovePosition", //: A position finished moving (e.g. user finished dragging).
  "scaling", //: A feature is being scaled.
  "scaled", //: A feature finished scaling (increase/decrease) (e.g. user finished dragging).
  "rotating", //: A feature is being rotated.
  "rotated", //: A feature finished rotating (e.g. user finished dragging).
  "translating", //: A feature is being translated.
  "translated", //: A feature finished translating (e.g. user finished dragging).
  "startExtruding", //: An edge started extruding (e.g. user started dragging).
  "extruding", //: An edge is extruding.
  "extruded", //: An edge finished extruding (e.g. user finished dragging).
  "split", //: A feature finished splitting.
  "cancelFeature",
] as const;

export const geometryToGeoEWKT = (
  f: GeoJSONFeature["geometry"],
  srid?: number,
) => {
  if (f.type === "GeometryCollection") {
    return {
      $ST_GeomFromEWKT: [
        `${srid ? `SRID=${srid};` : ""}GEOMETRYCOLLECTION(${f.geometries.map((g) => geometryToGeoEWKT(g, srid))})`,
      ],
    };
  }
  const { type, coordinates } = f;
  const coordsToStr = (point: number[]) => point.join(" ");
  const coordListToStr = (line: number[][]) => line.map(coordsToStr).join(", ");
  const coordListsToStr = (lines: number[][][]) =>
    lines.map((l) => `( ${coordListToStr(l)} )`).join(", ");

  let str = "";
  if (type === "LineString") {
    str = `${type}(${coordListToStr(coordinates)})`;
  } else if (type === "MultiLineString" || type === "Polygon") {
    str = `${type}(${coordListsToStr(coordinates)})`;
  } else if (type === "Point") {
    str = `${type}(${coordinates.join(" ")})`;
  }
  if (type === "MultiPolygon") {
    str = `${type}((${coordinates.map((c0) => coordListsToStr(c0))}))`;
  }
  return { $ST_GeomFromEWKT: [`${srid ? `SRID=${srid};` : ""}${str}`] };
};
