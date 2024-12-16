import { mdiPencil, mdiPlus } from "@mdi/js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { InfoRow } from "../../components/InfoRow";
import Select from "../../components/Select/Select";
import type { FullExtraProps } from "../../pages/ProjectConnection/ProjectConnection";
import SmartForm from "../SmartForm/SmartForm";
import type { LayerTable, W_MapProps } from "../W_Map/W_Map";
import type { GeoJSONFeature, GeoJsonLayerProps } from "./DeckGLMap";
import type { DeckGlLibs, DeckWrapped } from "./DeckGLWrapped";
import type { AllDrawModes } from "./mapDrawUtils";
import { DrawModes, geometryToGeoEWKT } from "./mapDrawUtils";
import type { Feature } from "geojson";
import type { GeoJsonLayer } from "deck.gl";
import { isDefined } from "../../utils";
import { scaleLinear } from "d3-scale";

export type DeckGLFeatureEditorProps = {
  deckW: DeckWrapped;
  edit: Pick<W_MapProps, "layerQueries"> &
    Pick<FullExtraProps, "dbProject" | "dbTables" | "dbMethods" | "theme"> & {
      feature:
        | undefined
        | (Feature & {
            properties: GeoJSONFeature["properties"] & {
              geomColumn: string;
              tableName: string;
            };
          });
      onStartEdit: VoidFunction;
      onInsertOrUpdate: VoidFunction;
    };
  onRenderLayer: (layer: GeoJsonLayer | undefined) => void;
  deckGlLibs: DeckGlLibs;
  /**
   * Used for snapping
   */
  geoJsonLayers?: GeoJsonLayerProps[];
};

type DrawnShape =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] };

export const DeckGLFeatureEditor = ({
  onRenderLayer,
  edit,
  deckGlLibs,
  deckW,
}: DeckGLFeatureEditorProps) => {
  const {
    dbProject,
    dbTables,
    feature,
    layerQueries,
    dbMethods,
    onInsertOrUpdate,
  } = edit;

  const [editMode, setEditMode] = useState<{
    modeKey: keyof AllDrawModes;
    geometry: DrawnShape | undefined;
    initialGeometry: Feature["geometry"] | undefined;
    tableName: string;
    geomColumn: string;
    $rowhash: string | undefined;
    finished?: boolean;
    error?: any;
  }>();
  const modeKey = editMode?.modeKey ?? "ViewMode";
  const isUpdate = !!editMode?.$rowhash;

  const clearEditMode = useCallback(
    (dataWasEdited = false) => {
      setEditMode(undefined);
      if (dataWasEdited) {
        onInsertOrUpdate();
      }
    },
    [onInsertOrUpdate, setEditMode],
  );

  const defaultData = useMemo(
    () =>
      !editMode?.geometry ?
        undefined
      : {
          [editMode.geomColumn]: geometryToGeoEWKT(editMode.geometry),
        },
    [editMode],
  );

  const finishEditMode = useCallback(
    async (insert = false) => {
      const layer =
        editMode?.geometry &&
        getDrawnLayer({ deckGlLibs, shapes: [editMode.geometry], deckW });
      onRenderLayer(layer);
      if (!(editMode && !editMode.finished)) {
        return;
      }
      if (insert && defaultData) {
        try {
          if (isUpdate) {
            await dbProject![editMode.tableName]!.update!(
              { $rowhash: editMode.$rowhash },
              defaultData,
            );
          } else {
            await dbProject![editMode.tableName]!.insert!(defaultData);
          }
          onInsertOrUpdate();
          setEditMode(undefined);
        } catch (error) {
          setEditMode({ ...editMode, error, finished: true });
        }
      } else {
        setEditMode({ ...editMode, finished: true });
      }
    },
    [
      editMode,
      defaultData,
      isUpdate,
      dbProject,
      onInsertOrUpdate,
      deckGlLibs,
      onRenderLayer,
      deckW,
    ],
  );
  const renderShapes = useCallback(
    (cursorCoords: [number, number] | undefined) => {
      if (!editMode) {
        onRenderLayer(undefined);
        return;
      }
      const { geometry } = editMode;
      const renderedShapes: DrawnShape[] = [];
      if (geometry?.type === "LineString") {
        const extendedCoords =
          cursorCoords ?
            [...geometry.coordinates, cursorCoords]
          : geometry.coordinates;
        renderedShapes.push({
          type: "LineString",
          coordinates: extendedCoords,
        });
      } else if (geometry?.type === "Polygon") {
        const currPoints = geometry.coordinates[0];
        const [firstPoint, ...otherPoints] = currPoints ?? [];
        if (firstPoint && otherPoints.length) {
          const extendedCoords =
            cursorCoords ?
              [...currPoints!, cursorCoords, firstPoint]
            : [...currPoints!, firstPoint];
          // if(invalidPolygon(extendedCoords)){

          // }
          renderedShapes.push({
            type: "Polygon",
            coordinates: [extendedCoords],
          });
        } else if (firstPoint && cursorCoords) {
          renderedShapes.push({
            type: "LineString",
            coordinates: [firstPoint, cursorCoords],
          });
        }
      }
      /* Shows cursor position */
      renderedShapes.push({
        type: "Point",
        coordinates: cursorCoords as [number, number],
      });

      const layer = getDrawnLayer({
        deckGlLibs,
        shapes: renderedShapes,
        deckW,
      });
      onRenderLayer(layer);
    },
    [onRenderLayer, deckGlLibs, editMode, deckW],
  );

  useEffect(() => {
    if (!editMode || editMode.finished) {
      return;
    }
    const onPointerMove = (e: PointerEvent) => {
      const cursorCoords = deckW.currHover?.coordinate as
        | [number, number]
        | undefined;
      if (!cursorCoords) return;
      renderShapes(cursorCoords);
    };
    const onPointerDown = (e: PointerEvent) => {
      const deleteLastPoint = e.ctrlKey;
      const cursorCoords = deckW.currHover?.coordinate as
        | [number, number]
        | undefined;
      if (!cursorCoords) return;
      const { geometry } = editMode;
      if (editMode.modeKey === "DrawPointMode") {
        setEditMode({
          ...editMode,
          geometry: { type: "Point", coordinates: cursorCoords },
          finished: true,
        });
        return false;
      } else if (editMode.modeKey === "DrawLineStringMode") {
        const newCoordinates =
          deleteLastPoint ?
            [
              ...(geometry?.type === "LineString" ?
                geometry.coordinates.slice(0, -1)
              : []),
            ]
          : [
              ...(geometry?.type === "LineString" ? geometry.coordinates : []),
              cursorCoords,
            ];
        setEditMode({
          ...editMode,
          geometry: { type: "LineString", coordinates: newCoordinates },
        });
        return false;
      } else if (editMode.modeKey === "DrawPolygonMode") {
        const newCoordinates =
          deleteLastPoint ?
            [
              ...(geometry?.type === "Polygon" ?
                geometry.coordinates[0]!.slice(0, -1)
              : []),
            ]
          : [
              ...(geometry?.type === "Polygon" ? geometry.coordinates[0]! : []),
              cursorCoords,
            ];
        setEditMode({
          ...editMode,
          geometry: { type: "Polygon", coordinates: [newCoordinates] },
        });
        return false;
      }
      setEditMode({
        ...editMode,
        geometry: {
          type: "Point",
          coordinates: deckW.currHover?.coordinate as [number, number],
        },
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        /* Many shapes have no geometry until Enter is pressed */
        if (!editMode.geometry) {
          return;
        }
        finishEditMode();
      } else if (e.key === "Escape") {
        clearEditMode();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    renderShapes,
    deckW,
    deckGlLibs,
    editMode,
    clearEditMode,
    finishEditMode,
  ]);

  useEffect(() => {
    renderShapes(undefined);
  }, [editMode?.geometry, renderShapes]);

  const wasUpdated =
    (isUpdate &&
      JSON.stringify(editMode.initialGeometry) !==
        JSON.stringify(editMode.geometry)) ||
    editMode?.geometry;

  const layerTables: LayerTable[] = (
    layerQueries?.filter((l) => "tableName" in l) as LayerTable[]
  )
    .map((l) => ({ ...l, rootTable: l.path?.at(-1) ?? l.tableName }))
    .filter((l) => dbProject[l.tableName]?.update);

  if (!layerTables.length) {
    return null;
  }

  if (editMode) {
    if (editMode.finished && editMode.geometry) {
      const filter =
        editMode.$rowhash ?
          [{ fieldName: "$rowhash", value: editMode.$rowhash }]
        : undefined;
      return (
        <SmartForm
          theme={edit.theme}
          asPopup={true}
          tableName={editMode.tableName}
          rowFilter={filter}
          db={dbProject}
          tables={dbTables}
          methods={dbMethods}
          defaultData={defaultData}
          onSuccess={() => clearEditMode(true)}
          onClose={clearEditMode}
          hideChangesOptions={true}
          confirmUpdates={true}
        />
      );
    }

    const pressEnterHint = "Press Enter to finish drawing.";
    const drawingIconPath = DrawModes[editMode.modeKey].iconPath;
    const hintText =
      (editMode.modeKey === "DrawPolygonMode" ?
        `Click to place polygon points. Ctrl+Click to delete last point. ${pressEnterHint}`
      : editMode.modeKey === "DrawLineStringMode" ?
        `Click to place line points. Ctrl+Click to delete last point. ${pressEnterHint}`
      : editMode.modeKey === "DrawPolygonByDraggingMode" ?
        `Click and drag to draw polygon. Release to finish.`
      : editMode.modeKey === "DrawRectangleMode" ?
        `Click top left and then bottom right rectangle corner.`
      : editMode.modeKey === "DrawSquareMode" ?
        `Click top left and then bottom right square corner.`
      : editMode.modeKey === "DrawEllipseByBoundingBoxMode" ?
        `Click top left and then bottom right ellipse edge.`
      : "Click to place point.") + " Press Escape to cancel.";
    return (
      <div className="flex-row gap-1 f-1 bg-color-1 rounded shadow p-1 ai-center">
        {!editMode.geometry ?
          <>
            <Btn
              className="shadow"
              variant="faded"
              onClick={() => setEditMode(undefined)}
            >
              Cancel
            </Btn>
            <InfoRow
              className="h-fit "
              color="action"
              variant="naked"
              iconPath={drawingIconPath}
            >
              {hintText}
            </InfoRow>
          </>
        : <div className="flex-row gap-1 f-1">
            <Btn
              className="shadow"
              variant="faded"
              onClick={() => clearEditMode(false)}
            >
              Cancel
            </Btn>
            {wasUpdated && (
              <>
                <Btn
                  variant="filled"
                  color="action"
                  onClick={() => finishEditMode()}
                >
                  Done
                </Btn>
                <Btn
                  variant="filled"
                  color="action"
                  onClick={() => finishEditMode(true)}
                >
                  Done and {isUpdate ? "update" : "insert"}
                </Btn>
                {layerTables.length > 1 && (
                  <Select
                    value={editMode.tableName}
                    fullOptions={layerTables.map((l) => ({ key: l.tableName }))}
                    onChange={(tableName) =>
                      setEditMode({ ...editMode, tableName })
                    }
                    btnProps={{
                      className: "shadow",
                    }}
                  />
                )}
              </>
            )}
            {isUpdate && (
              <Btn
                className="ml-auto"
                variant="faded"
                color="danger"
                onClick={async () => {
                  try {
                    await dbProject[editMode.tableName]?.delete!({
                      $rowhash: editMode.$rowhash,
                    });
                    setEditMode(undefined);
                    onInsertOrUpdate();
                  } catch (error) {
                    setEditMode({ ...editMode, error });
                  }
                }}
              >
                Delete
              </Btn>
            )}
          </div>
        }
        {!!editMode.error && <ErrorComponent error={editMode.error} />}
      </div>
    );
  }

  const firstTable = layerTables[0];
  if (edit.feature) {
    return (
      <>
        <Btn
          iconPath={mdiPencil}
          color="action"
          variant="filled"
          size="small"
          title={"Edit selected feature"}
          onClick={() => {
            if (feature) {
              const { geomColumn, tableName, $rowhash } = feature.properties;
              const supportedGeometryTypes = [
                "Point",
                "LineString",
                "Polygon",
              ] satisfies DrawnShape["type"][];
              if (
                !supportedGeometryTypes.includes(feature.geometry.type as any)
              ) {
                alert(
                  `Unsopperted geometry type: ${feature.geometry.type}. Supported geometries: ${supportedGeometryTypes}`,
                );
                return;
              }
              setEditMode({
                tableName,
                geomColumn,
                geometry: feature.geometry as any,
                modeKey: "ModifyMode",
                $rowhash,
                initialGeometry: feature.geometry,
              });
            }
          }}
        >
          Edit feature
        </Btn>
      </>
    );
  }

  if (firstTable) {
    return (
      <Select
        title="Select shape type"
        fullOptions={Object.entries(DrawModes).map(
          ([key, { label, iconPath }]) => ({
            key: key as keyof AllDrawModes,
            label,
            iconPath,
          }),
        )}
        iconPath={mdiPlus}
        showIconOnly={true}
        value={modeKey}
        onChange={(modeKey) => {
          setEditMode({
            $rowhash: undefined,
            initialGeometry: undefined,
            error: undefined,
            tableName: firstTable.tableName,
            geomColumn: firstTable.geomColumn,
            modeKey,
            geometry: undefined,
          });
        }}
        btnProps={{
          color: "action",
          variant: "filled",
          iconStyle: {
            color: "inherit",
          },
        }}
      />
    );
  }

  return <>Something went wrong</>;
};

type GetDrawnLayerArgs = {
  shapes: DrawnShape[];
  deckGlLibs: DeckGlLibs;
  deckW: DeckWrapped;
};
const getDrawnLayer = ({ deckGlLibs, shapes, deckW }: GetDrawnLayerArgs) => {
  const zoom = deckW.deck.getViewports()[0]?.zoom ?? 1;
  const radiusScale = scaleLinear().domain([0, 20]).range([10, 0.01]);
  const radius = radiusScale(zoom);
  const layer = new deckGlLibs.lib.GeoJsonLayer({
    id: "prostgles-geojson-editor",
    data: {
      type: "FeatureCollection",
      features: shapes.map((geometry, i) => ({
        id: i,
        type: "Feature",
        geometry,
        properties: {},
      })),
    },
    filled: true,
    pointRadiusMinPixels: 5,
    pointRadiusMaxPixels: 10,
    pointRadiusScale: 1,
    // pointType: 'circle',
    getPointRadius: radius,
    extruded: false,
    getElevation: 0,
    getFillColor: (f) =>
      f.geometry.type === "Polygon" ? [200, 0, 80, 55] : [0, 129, 167, 255],
    getLineColor: (f) =>
      f.geometry.type === "Polygon" ? [200, 0, 80, 255] : [0, 129, 167, 255],
    lineWidthMinPixels: 2,
    widthScale: 22,
    lineWidth: (f) => f.properties?.lineWidth ?? 1,
    pickable: true,
    pickingRadius: 10,
    autoHighlight: true,
    onClick: console.log,
  });

  return layer;
};
const invalidPolygon = (extendedCoords: [number, number][]) => {
  const lines = extendedCoords
    .map((p, i) => {
      const p2 = extendedCoords[i + 1];
      if (!p2) return;
      return [...p, ...p2] as [number, number, number, number];
    })
    .filter(isDefined);
  let intersection;
  lines.find((l, i) =>
    lines.some((l2, i2) => {
      /** Start and end */
      if (i === i2) return false;
      if (i === 0 && i2 === lines.length - 1) return false;
      if (i2 === 0 && i === lines.length - 1) return false;
      /** One after the other */
      if (i >= i2 - 1 && i <= i2 + 1) return false;
      if (i2 >= i - 1 && i2 <= i + 1) return false;

      const inters = intersect(...l, ...l2);
      if (!inters) return false;
      intersection ??= {
        ...inters,
        l,
        l2,
      };
      return inters;
    }),
  );
  // console.log(intersection);
  // if(intersection){
  //   renderedShapes.push({
  //     type: "Point",
  //     coordinates: [intersection.x, intersection.y]
  //   })
  //   renderedShapes.push({
  //     type: "LineString",
  //     coordinates: [
  //       intersection.l[0],
  //       intersection.l[1],
  //       intersection.l2[0],
  //       intersection.l2[1],
  //     ]
  //   })
  // }
};
const intersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  // // Ensure lines overlap 1d
  // if(!(x1 < x3 && x2 > x4 || x3 < x1 && x4 > x2 || y1 < y3 && y2 > y4 || y3 < y1 && y4 > y2)){
  //   return false
  // }

  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);

  return { x, y };
};
