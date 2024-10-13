import { isDefined } from "../../../utils";
import type { GeoJSONFeature } from "../../Map/DeckGLMap";
import { osmRelationToGeoJSON } from "./osmToGeoJSON";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type OSMElementType = "node" | "way" | "relation";

type OSMElementBase = {
  id: number;
  type: OSMElementType;
  tags: { [key: string]: string | undefined };
}

export type OSMNode = OSMElementBase & {
  type: "node";
  lat: number;
  lon: number;
}

export type OSMWay = Omit<OSMElementBase, "type"> & {
  type: "way";
  nodes: number[]; // Array of node IDs
}

export type OSMRelationMemberWay = {
  ref: number; // Reference ID of the member element
  type: "way";
  role: "outer" | "inner";
}
export type OSMRelationMemberNode = {
  ref: number; // Reference ID of the member element
  type: "node";
  role: "admin_centre" | "label";
}
export type OSMRelationMember = OSMRelationMemberWay | OSMRelationMemberNode;

export type OSMRelation = OSMElementBase & {
  type: "relation";
  members: OSMRelationMember[];
}

export type OSMElement = OSMNode | OSMWay | OSMRelation;

const cachedFeatures: Map<number, GeoJSONFeature> = new Map();
export const getOSMData = async (query: string, bbox: string) => {  
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: query.replace(/\${bbox}/g, bbox),
    cache: "default",
  });
  const data: {
    elements: OSMElement[];
}  = await response.json();
  const cache = data.elements.map(d => cachedFeatures.get(d.id));
  const nonCached = data.elements.filter((d, i) => !cache[i]);
  const features = await getOSMDataAsGeoJson({
    elements: nonCached
  });
  console.log(data.elements, features)
  return { 
    data, 
    features: [...cache.filter(isDefined), ...features], 
  };
}

const cachedElements: Map<number, OSMElement> = new Map();
const fetchElements = async <T extends "node" | "way">(type: T, ids: number[]): Promise<Map<number, T extends "node"? OSMNode : OSMWay>> => {
  if(!ids.length) return new Map();
  const limit = 10000;
  let batchNodeIds: number[];
  let step = 0;
  const nonCachedIds = ids.filter(id => !cachedElements.has(id));
  let elements: any[] = ids.map(id => cachedElements.get(id)).filter(isDefined);
  do {
    batchNodeIds = nonCachedIds.splice(0, limit);
    step++;
    if(!batchNodeIds.length) break;
    const nodeBatch = await fetch(OVERPASS_URL, {
      method: "POST",
      body: `[out:json];${type}(id:${batchNodeIds.join(",")});out ${limit};`,
    }).then(res => res.json()).then(res => res.elements);
    elements = [
      ...elements, 
      ...nodeBatch
    ];
    nodeBatch.forEach((node: any) => {
      cachedElements.set(node.id, node);
    });
  } while (batchNodeIds.length);

  const map = new Map<number, any>();
  elements.forEach((node: any) => {
    map.set(node.id, node);
  });
  return map;
}

const wayToLineString = (way: OSMWay, nodes: Map<number, OSMNode>): GeoJSONFeature["geometry"] => {
  const coordinates: [number, number][] = way.nodes.map((nodeId: number) => {
    const node = nodes.get(nodeId);
    return node ? [node.lon, node.lat] satisfies [number, number] : undefined;
  }).filter(isDefined);
  
  return  {
    type: "LineString",
    coordinates,
  } 

}

export const getOSMDataAsGeoJson = async (responseData: { elements: OSMElement[]; }): Promise<GeoJSONFeature[]> => {
  const unique = <T,>(arr: T[]) => Array.from(new Set(arr));
  const wayIds = unique(
    responseData.elements
      .flatMap((e) => 
        e.type === "relation"? e.members.flatMap(m => m.type === "way"? m.ref : undefined).filter(isDefined) : undefined
      ).filter(isDefined)
    );
  const _nodeIds = unique(responseData.elements.flatMap((e) => {
    if(e.type === "node") return [e.id];
    if(e.type === "way") return e.nodes;
    // if(e.type === "relation") return e.members.map(member => member.ref);
    return [];
  })); 
  const ways = await fetchElements("way", wayIds);
  const wayNodeIds = unique(ways.values().toArray().flatMap(w => w.nodes));
  const nodeIds = unique([ ..._nodeIds, ...wayNodeIds]);
  const nodes = await fetchElements("node", nodeIds);
  
  const node = await fetchElements("node", [36935764]);
  console.log(node.values().toArray());
  const features: GeoJSONFeature[] = responseData.elements.flatMap((element) => {
    const commonProps: Pick<GeoJSONFeature, "id" | "properties" | "type"> = {
      id: element.id,
      type: "Feature",
      properties: {
        _is_from_osm: true,
        ...element.tags
      },
    }; 
    if (element.type === "node") {
      return {
        ...commonProps,
        geometry: {
          type: "Point",
          coordinates: [element.lon, element.lat],
        },
      } satisfies GeoJSONFeature;
    } else if (element.type === "way") {  
      return {
        ...commonProps,
        geometry: wayToLineString(element, nodes),
      } satisfies GeoJSONFeature;

    /*
      A relation can be a multipolygon or a route, node, etc.
    */
    } else if ((element as any).type === "relation") {
      // return ways.values().toArray().map(way => ({
      //   ...commonProps,
      //   geometry: wayToLineString(way, nodes),
      // }))

      return osmRelationToGeoJSON(element, nodes, ways);
      // // Convert ways to GeoJSON coordinates
      // const convertWayToCoordinates = (m: OSMRelationMemberWay) => {
      //   const way = ways.find((el) => el.id === m.ref);
      //   if(!way) {
      //     console.warn(`Way with ID ${m.ref} not found`);
      //     return undefined;
      //   }
      //   if(!way.nodes.length) {
      //     console.warn(`Way with ID ${m.ref} has no nodes`);
      //     return undefined;
      //   }
      //   const polygon: [number,number][] = way.nodes.map(nodeId => {
      //     const node = nodes.find((el) => el.id === nodeId);
      //     if(!node) return;
      //     const point: [number,number] = [node.lon, node.lat];
      //     return point;
      //   }).filter(isDefined);

      //   return polygon;
      // };

      // const outerWays = element.members.filter((m): m is OSMRelationMemberWay => m.type === "way" && m.role === "outer");
      // const innerWays = element.members.filter((m): m is OSMRelationMemberWay => m.type === "way" && m.role === "inner");
     
      // const coordinates: [number,number][][] = [];

      // const outerPolygon: Polygon["coordinates"] = outerWays.map(ow => convertWayToCoordinates(ow)).filter(isDefined);
      // // const innerPolygons
      // return {
      //   ...commonProps,
      //   geometry: {
      //     type: "Polygon",
      //     coordinates: outerPolygon,
      //   },
      // } satisfies GeoJSONFeature;
    }
    return undefined;
  }).filter(isDefined);

  return features;
};

// const convertOSMRelationToGeoJSON = (relation: OSMRelation): GeoJSONFeature => {
//   // Initialize an array to hold the coordinates for the GeoJSON polygons
//   const coordinates: number[][][][] = [];

//   // Function to convert a single way to a GeoJSON coordinates array
//   const convertWayToCoordinates = (nodes: OSMNode[]) => nodes.map(node => [node.lon, node.lat]);

//   // Process outer and inner ways
//   relation.members.forEach(m => {
//     if(m.type !== "way") return;
//     const way = ways;
//     const role = m.role;
//     if (role === 'outer') {
//       // For each outer way, we start a new polygon
//       const polygon: [number, number][][] = [convertWayToCoordinates(m.)];

//       // Find matching inner ways to this outer way (if applicable)
//       // Note: This example does not implement the logic to check if an inner way is within an outer way.
//       // In a real scenario, such spatial checks are necessary to correctly assign inner ways to their respective outer ways.
//       const innerWays = relation.ways.filter(innerRelationWay => innerRelationWay.role === 'inner').map(innerRelationWay => innerRelationWay.way);

//       innerWays.forEach(innerWay => {
//         // Add inner ways as holes in the polygon
//         polygon.push(convertWayToCoordinates(innerWay));
//       });

//       coordinates.push(polygon);
//     }
//   });

//   // Determine if the resulting structure should be a Polygon or MultiPolygon
//   let geometryType: 'Polygon' | 'MultiPolygon' = coordinates.length > 1 ? 'MultiPolygon' : 'Polygon';
//   let finalCoordinates: number[][][] | number[][][][] = geometryType === 'MultiPolygon' ? coordinates : coordinates[0];

//   return {
//     type: 'Feature',
//     properties: {}, // Add any relevant properties here
//     geometry: {
//       type: geometryType,
//       coordinates: finalCoordinates,
//     },
//   };
// }

/**
 * 
 * 
 * 
 *  {
      "type": "relation",
      "id": 16239,
      "members": [
        {
          "type": "node",
          "ref": 17328659,
          "role": "admin_centre"
        },
        {
          "type": "node",
          "ref": 26847709,
          "role": "label"
        },
        {
          "type": "way",
          "ref": 552999083,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091037,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 256857356,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091055,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091042,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091053,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091038,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091054,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091044,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091035,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091067,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 228959329,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 259895757,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 228959327,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 259019614,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091068,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091041,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091075,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 326054386,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 325724109,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091069,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091032,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1219081285,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 257416334,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091076,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091039,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 259924225,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091030,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 189282961,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 189282962,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 352730144,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 189282964,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 189282963,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 196091043,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195766338,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195765850,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 352444338,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195766210,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195766720,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 257216452,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195766713,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 276717608,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 259917558,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195766573,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195765882,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 189298029,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 189298023,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 189298024,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 30291613,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195825381,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 206275996,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 206382261,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195825380,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 206382259,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 206383859,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 742213136,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 742213135,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 934948758,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195825383,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 206383856,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 237445898,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 151179279,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 151179266,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 151225717,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 151225729,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 151225721,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 151225714,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 829756099,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 162817626,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 162817629,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 162817614,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 162817613,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 158015593,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 487070962,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 157042680,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 487109426,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 487109421,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 487070965,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 157042451,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 157042036,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 162657164,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 157039923,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 163926895,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 163972508,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 163972509,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 163972511,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 163972503,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 341689327,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 193603721,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 60544653,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 60541051,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 31550696,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 60541070,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 29412718,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 29412276,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 59468554,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 59468553,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 65623577,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 65623584,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194214594,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 65638854,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 53205767,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 31653649,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 31653653,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194214596,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194678296,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 29411494,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194214597,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 60550273,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 647896306,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 647873778,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 647864396,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 60550277,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 31654079,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194214593,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 31656343,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 193705603,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 38488451,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 60550282,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 60550286,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194214595,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 60550290,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194214598,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 438747945,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 31666008,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 516981982,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 31666000,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194139386,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194139384,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 313353139,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194135587,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194135570,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 194135591,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 193640487,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 193640488,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 193640489,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 193635071,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 193635069,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 192803918,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 192803919,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 192803920,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 192803917,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 192803923,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725739,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725595,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725410,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 751231230,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725728,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725726,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725312,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725309,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725737,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725367,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725597,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725303,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 751231229,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725321,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725340,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725313,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725518,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725702,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725318,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725523,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725302,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725359,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725491,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725339,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725730,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725361,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195725393,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746984,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746970,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746999,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 923751622,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195747004,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195747005,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195747007,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195747136,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746983,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746989,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195747112,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 831276710,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746957,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746963,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746961,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746962,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746946,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195747132,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1125697072,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746875,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 256437163,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 195746944,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 186276174,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 76030979,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 186276172,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 186276170,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 186276173,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 29598577,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1217969002,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1219374157,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 52394341,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 65490314,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 61672378,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51659225,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51659229,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1211932547,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1218572116,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1218572118,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51659212,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51659213,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1219071907,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 61687955,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51659146,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 64756498,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 61156039,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595523,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 61156033,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 803831097,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595540,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 52105442,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595549,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595547,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 1220607101,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 52105441,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 52105444,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595548,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 52105443,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595502,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595770,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 256024065,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595782,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595780,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595778,
          "role": "outer"
        },
        {
          "type": "way",
          "ref": 51595779,
          "role": "outer"
        },
        {
 */