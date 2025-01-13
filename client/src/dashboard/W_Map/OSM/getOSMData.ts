import { isDefined } from "../../../utils";
import type { GeoJSONFeature } from "../../Map/DeckGLMap";
import { osmRelationToGeoJSON } from "./osmToGeoJSON";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type OSMElementType = "node" | "way" | "relation";

type OSMElementBase = {
  id: number;
  type: OSMElementType;
  tags?: Partial<{ [key: string]: string }>;
};

export type OSMNode = OSMElementBase & {
  type: "node";
  lat: number;
  lon: number;
};

export type OSMWay = Omit<OSMElementBase, "type"> & {
  type: "way";
  nodes: number[]; // Array of node IDs
};

export type OSMRelationMemberWay = {
  ref: number; // Reference ID of the member element
  type: "way";
  role: "outer" | "inner";
};
export type OSMRelationMemberNode = {
  ref: number; // Reference ID of the member element
  type: "node";
  role: "admin_centre" | "label";
};
export type OSMRelationMember = OSMRelationMemberWay | OSMRelationMemberNode;

export type OSMRelation = OSMElementBase & {
  type: "relation";
  members: OSMRelationMember[];
};

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
  } = await response.json();
  const cache = data.elements.map((d) => cachedFeatures.get(d.id));
  const nonCached = data.elements.filter((d, i) => !cache[i]);
  const features = await getOSMDataAsGeoJson({
    elements: nonCached,
  });
  console.log(data.elements, features);
  return {
    data,
    features: [...cache.filter(isDefined), ...features],
  };
};

const cachedElements: Map<number, OSMElement> = new Map();
const fetchElements = async <T extends "node" | "way">(
  type: T,
  ids: number[],
): Promise<Map<number, T extends "node" ? OSMNode : OSMWay>> => {
  if (!ids.length) return new Map();
  const limit = 10000;
  let batchNodeIds: number[];
  let step = 0;
  const nonCachedIds = ids.filter((id) => !cachedElements.has(id));
  let elements: any[] = ids
    .map((id) => cachedElements.get(id))
    .filter(isDefined);
  do {
    batchNodeIds = nonCachedIds.splice(0, limit);
    step++;
    if (!batchNodeIds.length) break;
    const nodeBatch = await fetch(OVERPASS_URL, {
      method: "POST",
      body: `[out:json];${type}(id:${batchNodeIds.join(",")});out ${limit};`,
    })
      .then((res) => res.json())
      .then((res) => res.elements);
    elements = [...elements, ...nodeBatch];
    nodeBatch.forEach((node: any) => {
      cachedElements.set(node.id, node);
    });
  } while (batchNodeIds.length);

  const map = new Map<number, any>();
  elements.forEach((node: any) => {
    map.set(node.id, node);
  });
  return map;
};

const wayToLineString = (
  way: OSMWay,
  nodes: Map<number, OSMNode>,
): GeoJSONFeature["geometry"] => {
  const coordinates: [number, number][] = way.nodes
    .map((nodeId: number) => {
      const node = nodes.get(nodeId);
      return node ?
          ([node.lon, node.lat] satisfies [number, number])
        : undefined;
    })
    .filter(isDefined);

  return {
    type: "LineString",
    coordinates,
  };
};

export const getOSMDataAsGeoJson = async (responseData: {
  elements: OSMElement[];
}): Promise<GeoJSONFeature[]> => {
  const unique = <T>(arr: T[]) => Array.from(new Set(arr));
  const wayIds = unique(
    responseData.elements
      .flatMap((e) =>
        e.type === "relation" ?
          e.members
            .flatMap((m) => (m.type === "way" ? m.ref : undefined))
            .filter(isDefined)
        : undefined,
      )
      .filter(isDefined),
  );
  const _nodeIds = unique(
    responseData.elements.flatMap((e) => {
      if (e.type === "node") return [e.id];
      if (e.type === "way") return e.nodes;
      // if(e.type === "relation") return e.members.map(member => member.ref);
      return [];
    }),
  );
  const ways = await fetchElements("way", wayIds);
  const wayNodeIds = unique(
    ways
      .values()
      //@ts-ignore
      .toArray()
      .flatMap((w) => w.nodes),
  );
  const nodeIds = unique([..._nodeIds, ...wayNodeIds]);
  const nodes = await fetchElements("node", nodeIds as number[]);

  const features: GeoJSONFeature[] = responseData.elements
    .flatMap((element) => {
      const commonProps: Pick<GeoJSONFeature, "id" | "properties" | "type"> = {
        id: element.id,
        type: "Feature",
        properties: {
          _is_from_osm: true,
          ...element.tags,
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

        return osmRelationToGeoJSON(element, nodes, ways) ?? [];
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
    })
    .filter(isDefined);

  return features;
};
