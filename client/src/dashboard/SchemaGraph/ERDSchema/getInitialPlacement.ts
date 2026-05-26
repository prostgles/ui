import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3";
import type { SchemaShape } from "./useSchemaShapes";

type Shape = SchemaShape;

export const getInitialPlacement = (shapes: Shape[]): Shape[] => {
  // Separate rectangles and links
  const rectangles = shapes.filter((s) => s.type === "rectangle");
  const links = shapes.filter((s) => s.type === "linkline");

  const nodes = rectangles.map((rect) => ({
    id: rect.id,
    x: rect.coords[0] - rect.w / 2,
    y: rect.coords[1] - rect.h / 2,
    width: rect.w,
    height: rect.h,
    fx: null, // Allow movement
    fy: null,
  }));

  const d3Links = links.map((link) => ({
    source: link.sourceId,
    target: link.targetId,
  }));

  // Create collision force that prevents rectangle overlap
  const collisionForce = forceCollide()
    .radius((d: any) => Math.max(d.width, d.height) / 2 + 20) // Add padding
    .strength(1)
    .iterations(20);

  // Create custom rectangle collision force for more accurate collision detection
  const rectangleCollision = (alpha: number) => {
    const padding = 20;
    const nodes2 = nodes;

    for (let i = 0; i < nodes2.length; i++) {
      for (let j = i + 1; j < nodes2.length; j++) {
        const node1 = nodes2[i];
        const node2 = nodes2[j];

        if (!node1 || !node2) continue;
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;

        const minDistX = (node1.width + node2.width) / 2 + padding;
        const minDistY = (node1.height + node2.height) / 2 + padding;

        if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
          // Calculate overlap
          const overlapX = minDistX - Math.abs(dx);
          const overlapY = minDistY - Math.abs(dy);

          // Separate along the axis with less overlap
          if (overlapX < overlapY) {
            const moveX = (overlapX / 2) * Math.sign(dx) * alpha;
            node1.x -= moveX;
            node2.x += moveX;
          } else {
            const moveY = (overlapY / 2) * Math.sign(dy) * alpha;
            node1.y -= moveY;
            node2.y += moveY;
          }
        }
      }
    }
  };

  // Create the simulation
  const simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink(d3Links)
        .id((d: any) => d.id)
        .strength(0.5),
    )
    .force(
      "charge",
      forceManyBody()
        .strength(-300) // Repulsion between all nodes
        .distanceMax(500),
    )
    .force("collision", collisionForce)
    .force("rectangleCollision", rectangleCollision)
    .force("center", forceCenter(0, 0)) // Center the graph
    .force("boundingBox", () => {
      // Keep nodes within reasonable bounds
      nodes.forEach((node) => {
        node.x = Math.max(-1000, Math.min(1000, node.x));
        node.y = Math.max(-1000, Math.min(1000, node.y));
      });
    });

  simulation.stop();
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }

  // Update rectangle positions
  const updatedRectangles = rectangles.map((rect) => {
    const node = nodes.find((n) => n.id === rect.id)!;
    return {
      ...rect,
      coords: [Math.round(node.x), Math.round(node.y)] as [number, number],
    };
  });

  return [...updatedRectangles, ...links];
};
