export {}
// import 'ol/ol.css';
// import "./map.css";
// // import("ol").then(()=>{

// // })
// import { Map, View, Overlay } from 'ol';
// import TileLayer from 'ol/layer/Tile';
// import VectorLayer from 'ol/layer/Vector';
// import Group from 'ol/layer/Group';
// import { OSM, Vector as VectorSource, XYZ } from 'ol/source';
// import { Feature } from 'ol';
// import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';

// import { LineString, Point, Polygon, Circle } from 'ol/geom';
// import GeoJSON from 'ol/format/GeoJSON';
// import {defaults} from 'ol/interaction';
// import {getDistance} from 'ol/sphere';

// import * as olLoadingstrategy from 'ol/loadingstrategy';
// import * as proj from "ol/proj";

// import * as olformat from 'ol/format';

// import { METERS_PER_UNIT } from 'ol/proj/Units.js';
// import { fromLonLat } from 'ol/proj';


// // window.loadMap = loadMap;
// const GeometryTypes = ['Point', 'LineString', 'MultiLineString', 'MultiPoint', 'MultiPolygon', 'Polygon', 'GeometryCollection',  'Circle'];
// // let { map } = loadMap("map");
// let zoomedOnce = false;
// import { Query } from "./Dashboard";
// export type GeoJsonFeature = {
//   type: 'Feature',
//   geometry: {
//     coordinates: number[];
//     type: typeof GeometryTypes[number];
//   },
//   properties: any,
//   id: number | string | undefined;
// }


// // let loaderFunc: (p0: Extent) => Promise<GeoJsonFeature[]> = undefined;
// let loaderFunc: any;
// export type GetLayerData = (p0?: Extent) => Promise<GeoJsonFeature[]>;
// export type Layer = {
//   query: Query;
//   name: string;
//   getData?: GetLayerData;
//   mapLayer?: VectorLayer;
// }

// let map: Map;
// let currentLayers: Layer[] = [];


// // Source and vector layer
// var vectorSource = new VectorSource({
//   // projection: 'EPSG:4326',
  
// });

// var vectorLayer = new VectorLayer({
//   source: vectorSource,

// });

// let zoomed = false;
// async function setLayers(layers: Layer[], zoomToFeaturesOnce: boolean = false){
  
//   currentLayers.map(cl => {
//     if(cl.mapLayer) {
//       map.removeLayer(cl.mapLayer);
//       cl.mapLayer.dispose();
//     }
//   });

//   currentLayers = [];

//   layers.map(l => {
    
//     let vectorSource = new VectorSource({
//       // features: (new GeoJSON({ featureProjection: 'EPSG:3857' })).readFeatures({ type: "FeatureCollection", features: geoJsonFeatures })
//       format: new olformat.GeoJSON(),
//       strategy: olLoadingstrategy.bbox,
//     });

//     currentLayers.push({
//       ...l,
//     });

//   });
//   await setLayerData(undefined, zoomToFeaturesOnce);

//   if(!zoomed && vectorSource.getFeatures().length){

//     map.getView().fit(vectorSource.getExtent());//, map.getSize());
//     zoomed = true;
//   }
// }

// async function setLayerData(bbox?, zoomToFeaturesOnce = false){

//   return Promise.all(currentLayers.map(async l => {
//     const _ftrs = await (l.getData as any)(bbox);
  
//     let features = (new GeoJSON({ featureProjection: 'EPSG:3857', dataProjection: 'EPSG:3857' }))
//       .readFeatures({ 
//         type: "FeatureCollection", 
//         features: _ftrs 
//       }, {
//         dataProjection:'EPSG:3857',
//         featureProjection:'EPSG:3857'
//       })
      
//     vectorSource.clear(true);
//     vectorSource.addFeatures(features);
//     return true;
//   }));
// }

// function loadMap(node: any){
  

//   // var highlightStyle = new Style({
//   //   fill: new Fill({
//   //     color: 'rgba(255,255,255,0.7)'
//   //   }),
//   //   stroke: new Stroke({
//   //     color: '#3399CC',
//   //     width: 3
//   //   })
//   // });
  
//   var tileSource = new XYZ({
//     url: 'https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}'
//   }),
//   tileLayer = new TileLayer({
//     source: tileSource
//   });


//   map = new Map({
//     layers: [

//       // new TileLayer({ source: new OSM() }),
//       tileLayer,
//       // dataLayer

//       // new TileLayer({
//       //   source: new TileDebug()
//       // })
//     ],
//     pixelRatio: 1,
//     target: node,
//     view: new View({

//       /* Used for circles in metres */
//       // projection: 'EPSG:3857', //4326

//       /* Supposed to make tiles less blurry but does not work */
//       // resolutions: tileSource.getTileGrid().getResolutions(),

//       projection: 'EPSG:3857',
//       // center: [0, 0],
//       zoom: 1 ,
//       constrainResolution: true
//     })
//   });

  



//   map.addLayer(vectorLayer);

//   map.on("moveend", async function(e){
//     // event actions
//     const p0 = map.getView().calculateExtent();
//     // console.log("moveend", p0 )

//     const bbox = proj.transformExtent(p0, 'EPSG:3857', 'EPSG:4326');
//     await setLayerData(bbox);

//     // currentLayers.map(async l => {
//     //   const  _ftrs = await (l.getData as any)(bbox);

//     //   let features = (new GeoJSON({ featureProjection: 'EPSG:3857', dataProjection: 'EPSG:3857' }))
//     //     .readFeatures({ 
//     //       type: "FeatureCollection", 
//     //       features: _ftrs 
//     //     }, {
//     //       dataProjection:'EPSG:3857',
//     //       featureProjection:'EPSG:3857'
//     //     })
        
//     //   vectorSource.clear(true);
//     //   vectorSource.addFeatures(features);
      
//     // });
//   });


//   //    pointermove   click
//   map.on('click', function(event: any) {
  
//     map.forEachFeatureAtPixel(event.pixel, function(feature: any ,layer: any) {
//       console.log(feature.get());
//         // if ( feature.getId() == "IND" ) {
//         //         feature.setStyle(listenerStyle);
//         //         featureListener(event);
//         // }
//     });
//   });

//   // var tooltipContainer = document.getElementById('tooltip');
//   // var tooltipContent = document.getElementById('tooltip-content');

//   // var tooltip = new Overlay({
//   //   element: (tooltipContainer as HTMLElement),
//   //   autoPan: true,
//   //   autoPanAnimation: {
//   //     duration: 250
//   //   }
//   // });
//   // map.addOverlay(tooltip);
//   // var featureId = '';
//   // map.on('pointermove', function(evt) {
//   //   var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
//   //     if (featureId == feature.get('id')) {
//   //       return feature;
//   //     };
      
//   //     console.log(feature)
//   //     featureId = feature.get('id');
//   //     var coordinates = (feature as any).getGeometry().getCoordinates();
//   //     (tooltipContent as HTMLElement).innerHTML = '<p>You are over ' + featureId + JSON.stringify(feature.getProperties()) +'</p>';
//   //     tooltip.setPosition(coordinates);
//   //     return feature;
//   //   });
//   //   if (!feature && (featureId != '')) {
//   //     featureId = '';
//   //     tooltip.setPosition(undefined);
//   //   };
//   // });


//   // drawCircleInMeter(map, { r: 400000, x: 0, y: 51 }, vectorSource);
//   // for(let i = 0; i < 1000; i++){
//   //   drawCircleInMeter(map, { r: 40000, x: 0 + (i * 0.001), y: 51 + (i * 0.001)}, vectorSource);
//   // }
 
//   return {
//     map,
//     drawCircleInMeter
//   }

// }

// /* Change circle
//   window.circleFeature.getGeometry().setRadius(2022222)
// */


// import React, { useState, useEffect } from 'react';
// import { Extent } from 'ol/extent';
// import { FeatureLike } from 'ol/Feature';
// import { get } from 'src/utils';
// import GeometryType from 'ol/geom/GeometryType';

// type P = {
//   queries: Query[];
//   db: any;
// }

// export type GridCell = {
//   x: number;
//   y: number;
//   w: number;
//   h: number;
// }
// export function extentToGrid(ex4326: Extent, minCellsPerSide: number = 10, edgePaddingFactor = 0.5): GridCell[] {
//   const ex = ex4326;// proj.transformExtent(ex4326,  'EPSG:4326', 'EPSG:3857'); //ex4326;// 
//   const x1 = ex[0],
//     y1 = ex[1],
//     x2 = ex[2],
//     y2 = ex[3],
//     _x1 = ex4326[0],
//     _y1 = ex4326[1],
//     _x2 = ex4326[2],
//     _y2 = ex4326[3],
//     wMetres = getDistance([_x1, _y1], [_x2, _y1]),
//     hMetres = getDistance([_x1, _y1], [_x1, _y2]),
//     wDegrees = x2 - x1,
//     hDegrees = y2 - y1,
//     hMetresPerDegs = hMetres/hDegrees,
//     wPhDeg = wDegrees/hDegrees,
//     w = (wMetres < hMetres)? wDegrees/minCellsPerSide : hDegrees/minCellsPerSide,
//     h = w + 0;
//     console.log(hDegrees, h)

//   const xg1 = x1 - w/2,
//     yg1 = y1 - h/2;
    
//   let res = [],
//     wNo = Math.ceil(wDegrees/w) + 1,
//     hNo = Math.ceil(hDegrees/h) + 1;

//   new Array(wNo).fill(0).map((d, xi) => {
//     new Array(hNo).fill(0).map((d, yi) => {
//       res.push({
//         x: xg1 + xi * w,
//         y: yg1 + yi * h,
//         w,
//         h
//       })
//     })
//   });

//   return res;
// }

// export default function MapComp(props: P) {
//   const { db, queries = [] } = props;
//   const [ref, setRef] = useState<Node>();
//   const [_map, setMap] = useState<any>();

//   const onGetData = async (bbox: Extent, q: Query): Promise<GeoJsonFeature[]> => {
//     // if(!queries || !queries.length) return [];

//     // const deFtrs = await Promise.all(queries.filter((q: any)=> q.geo).map(async (q: Query) => {
//       // console.log(q)
//       let cells = [];
//       if(bbox){
//         cells = extentToGrid(bbox).map((c, i)=> ({
//           id: i + "Ddwadawdawdaw" + Date.now(),
//           type: "Feature",
//           geometry: {
//             type: "MultiPolygon",          
//             coordinates: [[[
//               [c.x, c.y],
//               [c.x, c.y + c.h],
//               [c.x + c.w, c.y + c.h],
//               [c.x + c.w, c.y],
//               [c.x, c.y],
//             ]]],
//             crs: {
//               type: "name",
//               properties: {
//                 name: "EPSG:3857"
//               },
//             }
//           }        
//         }))
//         // console.log(bbox, cells)
//       }
//       const geoFilter = bbox? { [q.geo?.filterField as string]: { "&ST_MakeEnvelope": bbox } } : undefined,
//         filter = !q.filter? geoFilter : { $and: [q.filter, geoFilter].filter(f => f) };

//       let res = [];

//       if(q.geo.getData){
//         res = await Promise.all(cells.map(async c => {
//           return await q.geo.getData([c.x, c.y, c.x + c.w, c.y + c.h])
//         }))
//         // await q.geo.getData(bbox)
//       } else {
//         res = await db[q.tableName].find(filter);
//       }

//       const ftrs = res.map((d: any) => ({
//         type: 'Feature',
//         geometry: d[q.geo?.field as string],
//         properties: d,
//         id: d.gid || d.id
//       }));
//       if(cells.length && ftrs.length){
//         // console.log(JSON.stringify(cells[0].geometry, null, 2), JSON.stringify(ftrs[0].geometry, null, 2))
//       }
//       // console.log(ftrs[0])
//       return [...ftrs, ...cells];
//     // }));
      
//     // return deFtrs.flat() as GeoJsonFeature[];
//   }

//   useEffect(() => {
//     if(ref && !_map){
//       setMap(loadMap(ref));
//     }
//   }, [ref, map]);

//   useEffect(() => {
//     if(_map && db){
//       setLayers(queries.map(q => ({
//         name: q.tableName,
//         query: q,
//         getData: async (extent: Extent) => {
//           return await onGetData(extent, q);
//         }
//       })), true);
//     }
//   }, [queries, _map, db]);


//   return (
//     <div className="relative f-1">
//       <div ref={(e )=> {
//           if(e) setRef(e);
//         }}
//         // onDoubleClick={console.log}
//         className="flex-col p-p5 f-1 min-w-0 absolute" style={{ maxWidth: "100vw", height: "100%", width: "100%" }}>
//       </div>
//       <div id="tooltip" className="ol-tooltip">
//         <div id="tooltip-content"></div>
//       </div>
//     </div>
//   );
// }




// var image = new CircleStyle({
//   radius: 5,
//   fill: undefined,
//   stroke: new Stroke({color: 'red', width: 1}),
// });

// var styles = {
//   'Point': new Style({
//     image: image,
//   }),
//   'LineString': new Style({
//     stroke: new Stroke({
//       color: 'green',
//       width: 1,
//     }),
//   }),
//   'MultiLineString': new Style({
//     stroke: new Stroke({
//       color: 'green',
//       width: 1,
//     }),
//   }),
//   'MultiPoint': new Style({
//     image: image,
//   }),
//   'MultiPolygon': new Style({
//     stroke: new Stroke({
//       color: 'yellow',
//       width: 1,
//     }),
//     fill: new Fill({
//       color: 'rgba(255, 255, 0, 0.1)',
//     }),
//   }),
//   'Polygon': new Style({
//     stroke: new Stroke({
//       color: 'blue',
//       lineDash: [4],
//       width: 3,
//     }),
//     fill: new Fill({
//       color: 'rgba(0, 0, 255, 0.1)',
//     }),
//   }),
//   'GeometryCollection': new Style({
//     stroke: new Stroke({
//       color: 'magenta',
//       width: 2,
//     }),
//     fill: new Fill({
//       color: 'magenta',
//     }),
//     image: new CircleStyle({
//       radius: 10,
//       fill: undefined,
//       stroke: new Stroke({
//         color: 'magenta',
//       }),
//     }),
//   }),
//   'Circle': new Style({
//     stroke: new Stroke({
//       color: 'red',
//       width: 2,
//     }),
//     fill: new Fill({
//       color: 'rgba(255,0,0,0.2)',
//     }),
//   }),
// };

// var styleFunction = function (feature: FeatureLike) {
//   const type: string = (feature.getGeometry()?.getType()) || "";
//   return styles[(type as "Point")];
// };

// var drawCircleInMeter = function(map: any, { x, y, r: radius}: any, vectorSource: VectorSource) {
//   var view = map.getView();
//   var projection = view.getProjection();
//   var resolutionAtEquator = view.getResolution();
//   var center = fromLonLat([x, y]); // [x, y];// map.getView().getCenter();
//   var pointResolution = projection.getPointResolutionFunc_(resolutionAtEquator, center);
//   var resolutionFactor = resolutionAtEquator/pointResolution;
//   radius = (radius / METERS_PER_UNIT.m) * resolutionFactor;


//   var circle = new Circle(center, radius);
//   var circleFeature = new Feature(circle);
//   vectorSource.addFeature(circleFeature);
//   console.log(vectorSource.getFeatures().length)

//   // window.circleFeature = circleFeature;
//   // window.map = map;
// }