import React, { useEffect, useState } from "react";

import {
  EditableGeoJsonLayer,
  SelectionLayer,  
  ModifyMode,
  ResizeCircleMode,
  TranslateMode,
  TransformMode,
  ScaleMode,
  RotateMode,
  DuplicateMode,
  ExtendLineStringMode,
  SplitPolygonMode,
  ExtrudeMode,
  ElevationMode,
  DrawPointMode,
  DrawLineStringMode,
  DrawPolygonMode,
  DrawRectangleMode,
  DrawSquareMode,
  DrawRectangleFromCenterMode,
  DrawSquareFromCenterMode,
  DrawCircleByDiameterMode,
  DrawCircleFromCenterMode,
  DrawEllipseByBoundingBoxMode,
  DrawEllipseUsingThreePointsMode,
  DrawRectangleUsingThreePointsMode,
  Draw90DegreePolygonMode,
  DrawPolygonByDraggingMode,
  MeasureDistanceMode,
  MeasureAreaMode,
  MeasureAngleMode,
  ViewMode,
  CompositeMode,
  SnappableMode,
  ElevatedEditHandleLayer,
  PathMarkerLayer,
  SELECTION_TYPE,
  GeoJsonEditMode,
  Color, 
} from 'nebula.gl';
import { Geometry, Feature, FeatureCollection } from "@nebula.gl/edit-modes";
  
import { mdiEllipse, mdiEllipseOutline, mdiLocationEnter, mdiPencil, mdiPlus, mdiRectangle, mdiRectangleOutline, mdiVectorPolygon, mdiVectorPolygonVariant } from "@mdi/js";
import Btn from "../../components/Btn"; 
import { EditableGeojsonLayerProps } from "@nebula.gl/layers/dist-types/layers/editable-geojson-layer";
import { CompositeLayerProps, ScatterplotLayer } from "deck.gl/typed";
import SmartForm from "../SmartForm/SmartForm"; 
import { LayerTable, W_MapProps } from "../W_Map/W_Map";
import { FullExtraProps } from "../../pages/Project";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select"; 
import ErrorComponent from "../../components/ErrorComponent";
 

const modes = {
  ViewMode,
  DrawPointMode,
  DrawLineStringMode,
  DrawPolygonMode,
  DrawRectangleMode,
  DrawSquareMode,
  DrawRectangleFromCenterMode,
  DrawSquareFromCenterMode,
  DrawCircleByDiameterMode,
  DrawCircleFromCenterMode,
  DrawEllipseByBoundingBoxMode,
  DrawEllipseUsingThreePointsMode,
  DrawRectangleUsingThreePointsMode,
  Draw90DegreePolygonMode,
  DrawPolygonByDraggingMode,
  ModifyMode, 
  GeoJsonEditMode,
  TransformMode,
} as const;

const DrawModes = {
  DrawPointMode: { label: "Point", iconPath: mdiLocationEnter },
  DrawLineStringMode: { label: "LineString", iconPath: mdiLocationEnter },
  DrawPolygonMode: { label: "Polygon", iconPath: mdiVectorPolygonVariant },
  DrawPolygonByDraggingMode: { label: "Polygon Dragged", iconPath: mdiVectorPolygonVariant },
  DrawRectangleMode: { label: "Rectangle", iconPath: mdiRectangleOutline },
  DrawSquareMode: { label: "Square", iconPath: mdiRectangleOutline },
  DrawEllipseByBoundingBoxMode: { label: "Ellipse", iconPath: mdiEllipseOutline },
} as const satisfies Partial<Record<keyof typeof modes, {
  label: string;
  iconPath: string;
}>> ;

export type DeckGLFeatureEditorProps = {
  edit: Pick<W_MapProps, "layerQueries"> & Pick<FullExtraProps, "dbProject" | "dbTables" | "dbMethods" | "theme"> & {
    feature: undefined | (Feature & {
      properties: {
        geomColumn: string;
        tableName: string;
      }
    });
    onStartEdit: VoidFunction;
    onInsertOrUpdate: VoidFunction;
  }  
  onRenderLayer: (layer: EditableGeoJsonLayer) => void;
}
 
export const DeckGLFeatureEditor = ({ onRenderLayer, edit, }: DeckGLFeatureEditorProps) => {
  const { dbProject, dbTables, feature, layerQueries, dbMethods, onInsertOrUpdate } = edit;

  const [modeConfig, setModeConfig] = React.useState({ enableSnapping: false }); 
  const [editMode, setEditMode] = useState<{ 
    modeKey: keyof typeof modes;
    geometry: Geometry | undefined; 
    initialGeometry: Geometry | undefined; 
    tableName: string; 
    geomColumn: string;
    $rowhash: string | undefined; 
    finished?: boolean;
    error?: any;
  }>();
  const modeKey = editMode?.modeKey ?? "ViewMode";
  const isUpdate = !!editMode?.$rowhash;
  
  const data = getCollection(editMode?.geometry);
  const layerProps: EditableGeojsonLayerProps<any> & CompositeLayerProps = {
    id: "geojson-editor",
    data,
    mode: modes[modeKey],
    modeConfig,
    selectedFeatureIndexes: [0], 
    onEdit: ({ updatedData, editType }: { updatedData: FeatureCollection; editType: typeof EDIT_TYPES[number] }) => { 
      const { geometry } = updatedData.features[0] ?? {};
      setEditMode( editType === "cancelFeature"? undefined : { ...editMode!, geometry });
      // if(editType === "addFeature" && geometry && editMode){
      //   setEditMode({ ...editMode, geometry });
      // }
    },
    getTentativeFillColor: () => [0, 0,0 , 50],
    getTentativeLineColor: () => [0, 0,0 , 150],
    getFillColor: () => [0, 0,0 , 50],
    getLineColor: () => [0, 0,0 , 150], 
    _subLayerProps: {
      guides: {
        pointType: 'circle',
        _subLayerProps: {
          'points-circle': {
            // Styling for editHandles goes here
            type: ScatterplotLayer,
            radiusScale: 1,
            stroked: true,
            getLineWidth: 1,
            radiusMinPixels: 6,
            radiusMaxPixels: 8,
            getRadius: 6,
            getFillColor: [0, 0,0 , 50], 
            getLineColor: [0, 0,0 , 250], 
          },
        },
      },
    }
  }
  
  //@ts-ignore
  const layer = new EditableGeoJsonLayer(layerProps);

  useEffect(() => {
    onRenderLayer(layer); 
  }, [layer]); 

  const clearEditMode = (dataWasEdited = false) => {
    setEditMode(undefined);
    if(dataWasEdited){
      onInsertOrUpdate();
    }
  };
  const defaultData = !editMode?.geometry? undefined : { 
    [editMode.geomColumn]: geometryToGeoEWKT(editMode.geometry) 
  };
  const finishEditMode = async (insert = false) => {
    if(!(editMode && !editMode.finished)){
      return
    }
    if(insert && defaultData){
      try {
        if(isUpdate){
          await dbProject![editMode.tableName]!.update!({ $rowhash: editMode.$rowhash }, defaultData);
        } else {
          await dbProject![editMode.tableName]!.insert!(defaultData);
        }
        onInsertOrUpdate();
        setEditMode(undefined);
      } catch(error){
        setEditMode({ ...editMode, error, finished: true });
      }
    } else {

      setEditMode({ ...editMode, finished: true });
    }
  }
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if(e.key === "Enter"){
        finishEditMode();
      } 
      else if(e.key === "Escape"){
        clearEditMode();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    };

  }, [finishEditMode]);

  const wasUpdated = isUpdate && JSON.stringify(editMode.initialGeometry) !== JSON.stringify(editMode.geometry) || editMode?.geometry;

  let content: React.ReactNode = null;
  if(editMode){

    if(editMode.finished && editMode.geometry){
      const filter = editMode.$rowhash? [{ fieldName: "$rowhash", value: editMode.$rowhash }] : undefined;
      content = <SmartForm 
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
    } else {
      const showEnterHint = editMode.modeKey === "DrawPolygonMode" || editMode.modeKey === "DrawLineStringMode"
      content =  <div className="flex-row gap-1 f-1" >
        {!editMode.geometry? <>
          <Select 
            fullOptions={Object.entries(DrawModes)
              .map(([key, { label, iconPath }]) => ({
                key: key as keyof typeof DrawModes,
                label,
              }))
            }
            value={modeKey}
            onChange={modeKey => {
              setEditMode({ ...editMode, modeKey, geometry: undefined })
            }}
            label={"Add new"} 
          />
          {showEnterHint && <InfoRow className="h-fit as-end" color="action">Press Enter to finish. Escape to cancel</InfoRow>}
        </> : <div className="flex-row gap-1 f-1">
          <Btn variant="faded" onClick={() => clearEditMode(false)}>Cancel</Btn>
          {wasUpdated && <>
            <Btn variant="filled" color="action" onClick={() => finishEditMode()}>Done</Btn>
            <Btn variant="filled" color="action" onClick={() => finishEditMode(true)}>Done and {isUpdate? "update" : "insert"}</Btn> 
          </>}
          {isUpdate && <Btn className="ml-auto" variant="faded" color="danger" onClick={async () => {
            try {
              await dbProject[editMode.tableName]?.delete!({ $rowhash: editMode.$rowhash });
              setEditMode(undefined);
              onInsertOrUpdate();
            } catch(error){
              setEditMode({ ...editMode, error })
            }
          }}>Delete</Btn>}
        </div>}
        {!!editMode.error && <ErrorComponent error={editMode.error} />}
      </div>
    }

  } else {

    const layerTables: LayerTable[] = (layerQueries?.filter(l => "tableName" in l) as LayerTable[])
      .map(l => ({ ...l, rootTable: l.path?.at(-1) ?? l.tableName }))
      .filter(l => dbProject[l.tableName]?.update);
    const onAddShape = (l: LayerTable) => {
      setEditMode({ 
        tableName: l.path?.at(-1)?.table ?? l.tableName, 
        geomColumn: l.geomColumn, 
        geometry: undefined, 
        modeKey: "DrawPointMode", 
        $rowhash: undefined, 
        initialGeometry: undefined 
      }); 
    }
    if(edit.feature){
      content = <>
        <Btn 
          iconPath={mdiPencil} 
          color="action" 
          variant="filled" 
          size="small"
          title={"Edit selected feature"}
          onClick={() => {
            if(feature){
              const { geomColumn, tableName, $rowhash } = feature.properties;
              setEditMode({ tableName, geomColumn, geometry: feature.geometry, modeKey: "ModifyMode", $rowhash, initialGeometry: feature.geometry })
            } 
          }}
        >Edit feature</Btn>
      </>;

    } else if(layerTables.length === 1){
      content = <Btn 
        className="DeckGLFeatureEditor"
        iconPath={mdiPlus} 
        title="Add row" 
        variant="filled" 
        color="action" 
        size="small" 
        onClick={() => onAddShape(layerTables[0]!)}
      />;

    } else if(layerTables.length) {
      content = <PopupMenu
        button={
          <Btn 
            className="DeckGLFeatureEditor"
            iconPath={mdiPlus} 
            variant="filled" 
            color="action" 
            size="small" 
            title="Add row" 
          />
        }>
        {layerTables.map(l => "tableName" in l && 
            <Btn 
              key={l._id}
              onClick={() => onAddShape(l)}
            >
              {l.path?.length? [l.tableName, ...l.path].join(".") : l.tableName}
            </Btn>
          )
        }
      </PopupMenu>
    }
  }

  return <>{content}</>;
  // return <div className={"p-1 flex-row gap-1 " + (editMode? " shadow " : "")}
  //   style={{ 
  //     position: "absolute", 
  //     left: 0, top: 0, 
  //     background: editMode? "white" : "transparent",
  //     ...(editMode? { right: 0 } : { width: "fit-content" }), 
  //   }} 
  // >
  //   {content} 
  // </div>
}

const EDIT_TYPES = [
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


const getCollection = (f?: Geometry): FeatureCollection => ({
  type: 'FeatureCollection',
  features: f? [{ type: "Feature", geometry: f }] : [] as any,
});


const geometryToGeoEWKT = ({ type, coordinates }: Geometry, srid?: number) => {
  const coordsToStr = (point: number[]) => point.join(" ");
  const coordListToStr = (line: number[][]) => line.map(coordsToStr).join(", ");
  const coordListsToStr = (lines: number[][][]) => lines.map(l => `( ${coordListToStr(l)} )`).join(", ");
  
  let str = "";
  if(type === "LineString"){
    str = `${type}(${coordListToStr(coordinates)})`
  } else if(type === "MultiLineString" || type === "Polygon"){
    str = `${type}(${coordListsToStr(coordinates)})`
  } else if(type === "Point"){
    str = `${type}(${coordinates.join(" ")})`;
  } if(type === "MultiPolygon"){
    str = `${type}((${coordinates.map(c0 => coordListsToStr(c0))}))`
  } 
  return { ST_GeomFromEWKT: [`${srid? `SRID=${srid};`: ""}${str}`]  };
}