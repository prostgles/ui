
// import { mdiPlus } from "@mdi/js";
// import { Geometry } from "@nebula.gl/edit-modes";
// import React, { useEffect, useState } from "react";
// import Btn from "../../components/Btn";
// import { InfoRow } from "../../components/InfoRow";
// import PopupMenu from "../../components/PopupMenu";
// import { FullExtraProps } from "../../pages/Project";
// import { GeoJSONFeature, HoverCoords } from "../Map/DeckGLMap";
// import RTComp from "../RTComp";
// import SmartForm from "../SmartForm/SmartForm";
// import { LayerTable, ProstglesMapProps } from "./ProstglesMap";

// type Shape = {
//   type: "multiline";
//   coords: [number, number][];
// } | {
//   type: "point";
//   coords: [number, number];
// } | {
//   type: "polygon";
//   coords: [number, number][];
// } | {
//   type: "multipolygon",
  
// }


// type ShapeEditorProps = Pick<ProstglesMapProps, "layerQueries" | "prgl" > & {
//   style?: React.CSSProperties;
//   className?: string;
//   setShape: (shape?: Shape) => void;
//   setShapeEvents: (shapeEvents: { onPointerMove: (e: HoverCoords) => void; onClick: (e: HoverCoords) => void; } ) => void;
//   onStateChange: (state: { isDrawing: boolean }) => void;
// }

// type ShapeEditorState = {
//   shape?: Shape;
//   isEditing?: { tableName: string; geomColumn: string; shape?: Shape; type: Shape["type"] }
// }
// export default class ShapeEditor extends RTComp<ShapeEditorProps> {

//   state: ShapeEditorState = {

//   }

//   addPoint = (e: HoverCoords): Shape | undefined  => {
//     const { shape, isEditing } = this.state;
//     if(isEditing){
//       const { type } = isEditing;
//       const existingCoords = shape?.coords ?? [];
//       const newShape = {
//         type,
//         coords: type === "point"? e.coordinates : 
//           type === "multiline"? [
//             ...existingCoords,
//             e.coordinates
//           ] : [
//             ...existingCoords,
//             e.coordinates
//           ]
//       }

//       return newShape as Shape;
//     }
//   }

//   removeLastPoint = () => {
//     const { shape, isEditing } = this.state;
//     if(isEditing && shape){

//       if(shape.type === "multiline"){
//         this.setState({
//           shape: {
//             ...shape,
//             coords: shape.coords.slice(0, -1)
//           }
//         })
//       }
//     }
//   }

//   keyListener = (e: KeyboardEvent) => {
//     if(e.key === "Enter" && this.state.isEditing){
//       this.finishShape();
//     }
//   }
//   onMount(): void {
//     document.body.addEventListener("keydown", this.keyListener)
//   }

//   onUnmount(): void {
//     document.body.removeEventListener("keydown", this.keyListener)
//   }

//   finishShape = async (andInsert = false) => {
//     const { isEditing, shape } = this.state;
//     if(!isEditing || !shape) return;
//     if(andInsert){
//       try {
//         await this.props.prgl.db[isEditing?.tableName]!.insert!({ [isEditing.geomColumn]: shapeToGeoEWKT(shape) });
//         this.resetDrawing();
//       } catch (err) {
//         this.setState({ err })
//       }
//     } else {
//       this.setState({ isEditing: {
//         ...isEditing,
//         shape
//       }});
//     }
//     this.props.onStateChange({ isDrawing: false })
//   }

//   resetDrawing = () => {
//     this.setState({ isEditing: undefined, shape: undefined })
//     this.props.setShape()
//   }

//   onDelta = (dP, dS) => {

//     const { setShapeEvents } = this.props;
//     if(dP?.setShapeEvents){
//       setShapeEvents({
//         onClick: e => {
//           const { isEditing } = this.state;
//           if(isEditing && e.coordinates){
//             const newShape = this.addPoint(e)!;
//             this.setState({ shape: newShape });
            
//           }
//         },
//         onPointerMove: e => {
//           const { shape, isEditing } = this.state;
//           if(isEditing && e.coordinates && shape && shape.type !== "point"){
//             const movedShape = {
//               ...shape,
//               coords: [
//                 ...shape.coords,
//                 // ...(shape.coords.length > 1? shape.coords.slice(0, -1) : shape.coords),
//                 e.coordinates
//               ]
//             }
//             this.props.setShape(movedShape)
//             // this.setState({ shape: movedShape });
//           }
//         }
//       })
//     }


//     if(dS?.shape){
//       this.props.setShape(this.state.shape)
//     }
//   }

//   render(){
//     const { className, dbProject, style, layerQueries, dbTables, onStateChange } = this.props;
//     const comP = { className, style }
  
//     const { isEditing } = this.state;
//     let content: React.ReactNode;
//     if(isEditing){
  
//       if(isEditing.shape){
//         content =  <SmartForm 
//           tableName={isEditing.tableName} 
//           asPopup={true} 
//           db={dbProject} 
//           tables={dbTables} 
//           defaultData={{ [isEditing.geomColumn]: shapeToGeoEWKT(isEditing.shape) }} 
//           onSuccess={this.resetDrawing} 
//           onClose={this.resetDrawing}
//         />
//       } else {
//         content =  <div className="flex-col gap-1" >
//           <InfoRow >Adding shape</InfoRow>
//           <div className="flex-col gap-1">
//             <Btn variant="filled" color="action" onClick={() => this.finishShape()}>Done</Btn>
//             <Btn variant="filled" color="action" onClick={() => this.finishShape(true)}>Done and insert</Btn>
//             <Btn onClick={this.removeLastPoint}>Remove last point</Btn>
//             <Btn onClick={this.resetDrawing}>Cancel</Btn>
//           </div>
//         </div>
//       }
  
//     } else {

//       const layerTables: LayerTable[] = layerQueries?.filter(l => "tableName" in l && dbProject[l.tableName]?.update) as any;
//       const onAddShape = (l: LayerTable) => {
//         this.setState({ isEditing: { tableName: l.tableName, geomColumn: l.geomColumn, type: "multiline" } });
//         onStateChange({ isDrawing: true });
//       }
//       if(layerTables?.length === 1){
//         content = <Btn iconPath={mdiPlus} title="Add row" variant="filled" color="action" size="small" onClick={() => onAddShape(layerTables[0]!)}/>
//       } else if(layerTables?.length) {
//         content = <PopupMenu {...comP} button={<Btn iconPath={mdiPlus} variant="filled" color="action" size="small" title="Add row" />}>
//           {layerTables.map(l => "tableName" in l && 
//               <Btn key={l.tableName} onClick={() => onAddShape(l)}
//               >
//                 {l.tableName}
//               </Btn>
//             )
//           }
//         </PopupMenu>
//       }
//     }
  
//     return <div {...comP} className={(comP.className ?? "") + " p-1 " + (isEditing? "bg-0 shadow" : "")} >
//       {content}
//     </div>

//   }

// }
// export const geometryToGeoEWKT = (geom: Geometry) => {
//   return shapeToGeoEWKT({
//     ...geom,
//     type: geom.type.toLowerCase() as any
//   })
// }
// export function shapeToGeoEWKT(shape: Shape, srid?: number){
//   let str = "";
//   if(shape.type === "multiline"){
//     str = `LINESTRING(${shape.coords.map(([x, y]) => `${x} ${y}`).join(", ")})`
//   } else if(shape.type === "point"){
//     str = `POINT(${shape.coords[0]} ${shape.coords[1]})`
//   } else if(shape.type === "multipolygon"){
//     str = `POLYGON((${shape.coords.map(c => c.join(" ")).join(", ")}))`
//   } 
//   return { ST_GeomFromEWKT: [`${srid? `SRID=${srid};`: ""}${str}`]  };
// }

// export function shapeToGeoJSON(shape: Shape, srid?: number){

//   const result: GeoJSONFeature = {
//     id: "1",
//     type: "Feature",
//     properties: { },
//     geometry: shape.type === "multiline"? {
//         type: "LineString",
//         coordinates: shape.coords
//       } : shape.type === "point"? {
//         type: "Point",
//         coordinates: shape.coords
//       } : {
//         type: "Polygon",
//         coordinates: [shape.coords]
//       }
//   }
  
//   return result
// }