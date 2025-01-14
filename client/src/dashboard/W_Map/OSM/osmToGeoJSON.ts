import type { Feature, Geometry } from "geojson";
import { MultiPolygon, Polygon } from "geojson";
import { cloneDeep } from "lodash";
import type { OSMNode, OSMRelation, OSMWay } from "./getOSMData";

export const osmRelationToGeoJSON = (
  relation: OSMRelation,
  nodeMap: Map<number, OSMNode>,
  wayMap: Map<number, OSMWay>,
): Feature<Geometry, { [key: string]: any }> | null => {
  const relationMap = new Map<number, OSMRelation>();

  const getWayCoordinates = (wayId: number): [number, number][] => {
    const way = wayMap.get(wayId);
    if (!way || !way.nodes.length) {
      throw new Error(`Way ${wayId} not found`);
    }
    const coords: [number, number][] = way.nodes.map((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }
      return [node.lon, node.lat];
    });
    return coords;
  };

  // Assemble rings
  const rings: { role: string; coordinates: [number, number][] }[] = [];

  for (const member of relation.members) {
    if (member.type === "way") {
      const coords = getWayCoordinates(member.ref);
      rings.push({ role: member.role, coordinates: coords }); //  || "outer"
    } else if ((member as any).type === "relation") {
      console.log("Nested relation not handled");
      // Handle nested relations (optional, depends on your needs)
      // const nestedRelation = relationMap.get(member.ref);
      // if (nestedRelation) {
      //   const nestedFeature = osmRelationToGeoJSON(nestedRelation, nodeMap, wayMap);
      //   console.log("Nested feature:", nestedFeature);
      //   // Process nested features (e.g., merge polygons)
      //   // For simplicity, this code does not handle nested relations deeply
      // }
    }
  }

  // Function to assemble rings into complete rings (handle way fragments)
  const assembleRings = (
    rings: { role: string; coordinates: [number, number][] }[],
  ): { outer: [number, number][][]; inner: [number, number][][] } => {
    const outerRings: [number, number][][] = [];
    const innerRings: [number, number][][] = [];

    const ringMap: { [key: string]: [number, number][][] } = {};

    // Group rings by role
    for (const ring of rings) {
      if (!ringMap[ring.role]) {
        ringMap[ring.role] = [];
      }
      ringMap[ring.role]!.push(ring.coordinates);
    }

    // Assemble outer rings
    if (ringMap["outer"]) {
      outerRings.push(...assembleWays(ringMap["outer"]));
    }

    // Assemble inner rings
    if (ringMap["inner"]) {
      innerRings.push(...assembleWays(ringMap["inner"]));
    }

    return { outer: outerRings, inner: innerRings };
  };

  // Function to assemble ways into complete rings
  const assembleWays = (ways: [number, number][][]): [number, number][][] => {
    const rings: [number, number][][] = [];
    const used = new Set<number>();
    let ring: [number, number][] = [];

    while (ways.length > used.size) {
      let connected = false;
      for (let i = 0; i < ways.length; i++) {
        if (used.has(i)) continue;
        const way = ways[i]!;
        if (ring.length === 0) {
          ring = cloneDeep(way);
          used.add(i);
          connected = true;
          break;
        } else {
          const ringStart = ring[0]!;
          const ringEnd = ring[ring.length - 1]!;
          const wayStart = way[0]!;
          const wayEnd = way[way.length - 1]!;

          if (coordinatesEqual(ringEnd, wayStart)) {
            ring = ring.concat(way.slice(1));
            used.add(i);
            connected = true;
            break;
          } else if (coordinatesEqual(ringEnd, wayEnd)) {
            ring = ring.concat(way.slice(0, -1).reverse());
            used.add(i);
            connected = true;
            break;
          } else if (coordinatesEqual(ringStart, wayEnd)) {
            ring = way.slice(0, -1).concat(ring);
            used.add(i);
            connected = true;
            break;
          } else if (coordinatesEqual(ringStart, wayStart)) {
            ring = way.slice(1).reverse().concat(ring);
            used.add(i);
            connected = true;
            break;
          }
        }
      }

      if (!connected) {
        // Ring is complete
        if (ring.length > 0) {
          // Ensure the ring is closed
          if (!coordinatesEqual(ring[0]!, ring[ring.length - 1]!)) {
            ring.push(ring[0]!);
          }
          rings.push(ring);
        }
        ring = [];
      }
    }

    // Add the last ring if any
    if (ring.length > 0) {
      if (!coordinatesEqual(ring[0]!, ring[ring.length - 1]!)) {
        ring.push(ring[0]!);
      }
      rings.push(ring);
    }

    return rings;
  };

  // Helper function to compare coordinates
  const coordinatesEqual = (
    a: [number, number],
    b: [number, number],
  ): boolean => {
    return a[0] === b[0] && a[1] === b[1];
  };

  // Assemble the rings into polygons
  const { outer: outerRings, inner: innerRings } = assembleRings(rings);

  if (outerRings.length === 0) {
    console.error("No outer rings found for the relation.");
    return null;
  }

  const polygons: [[number, number][]][] = outerRings.map((outerRing) => {
    const polygon: [[number, number][]] = [outerRing];

    // Assign inner rings to this outer ring if needed
    // For simplicity, we're adding all inner rings to all outer rings
    // In practice, you should check which inner rings are within each outer ring
    for (const innerRing of innerRings) {
      polygon.push(innerRing);
    }

    return polygon;
  });

  // Create the GeoJSON geometry
  // @ts-ignore
  const geometry: Geometry =
    polygons.length > 1 ?
      {
        type: "MultiPolygon",
        coordinates: polygons,
      }
    : {
        type: "Polygon",
        coordinates: polygons[0],
      };

  // Construct the GeoJSON Feature
  const feature: Feature<Geometry, { [key: string]: any }> = {
    type: "Feature",
    properties: relation.tags || {},
    geometry: geometry,
  };

  return feature;
};
