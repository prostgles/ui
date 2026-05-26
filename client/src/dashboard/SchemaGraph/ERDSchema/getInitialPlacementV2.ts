import type { SchemaShape } from "./useSchemaShapes";

type Shape = SchemaShape;

type RectShape = Extract<Shape, { type: "rectangle" }>;
type LinkShape = Extract<Shape, { type: "linkline" }>;

type Node = {
  id: string;
  w: number;
  h: number;
  x: number; // center x
  y: number; // center y
  degree: number;
  neighbors: Set<string>;
  isOrphan: boolean;
};

const PADDING = 28;
const SPIRAL_STEP = 34;
const ANGLE_STEP = Math.PI / 8;
const MAX_RADIUS = 2500;

const RELAX_ITERS = 140;
const MAIN_CLUSTER_PULL = 0.028;
const ORPHAN_TARGET_PULL = 0.09;
const ORPHAN_CENTER_PULL = 0.012;
const GLOBAL_CENTER_PULL = 0.005;

function overlap(a: Node, b: Node, padding = PADDING): boolean {
  const minDx = (a.w + b.w) / 2 + padding;
  const minDy = (a.h + b.h) / 2 + padding;
  return Math.abs(a.x - b.x) < minDx && Math.abs(a.y - b.y) < minDy;
}

function hasAnyOverlap(
  candidate: Node,
  placed: Node[],
  padding = PADDING,
): boolean {
  for (const p of placed) {
    if (overlap(candidate, p, padding)) return true;
  }
  return false;
}

function findSpotNear(
  node: Node,
  anchorX: number,
  anchorY: number,
  placed: Node[],
): { x: number; y: number } {
  // Try anchor first
  const test: Node = { ...node, x: anchorX, y: anchorY };
  if (!hasAnyOverlap(test, placed)) return { x: anchorX, y: anchorY };

  // Spiral out from anchor
  for (let r = SPIRAL_STEP; r <= MAX_RADIUS; r += SPIRAL_STEP) {
    for (let t = 0; t < Math.PI * 2; t += ANGLE_STEP) {
      const x = anchorX + Math.cos(t) * r;
      const y = anchorY + Math.sin(t) * r;
      test.x = x;
      test.y = y;
      if (!hasAnyOverlap(test, placed)) return { x, y };
    }
  }

  // Fallback if very dense
  return { x: anchorX + MAX_RADIUS, y: anchorY + MAX_RADIUS };
}

function centroid(nodes: Node[]): { x: number; y: number } {
  if (!nodes.length) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const n of nodes) {
    sx += n.x;
    sy += n.y;
  }
  return { x: sx / nodes.length, y: sy / nodes.length };
}

function bounds(nodes: Node[]) {
  if (!nodes.length)
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.w / 2);
    minY = Math.min(minY, n.y - n.h / 2);
    maxX = Math.max(maxX, n.x + n.w / 2);
    maxY = Math.max(maxY, n.y + n.h / 2);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Pairwise rectangle collision resolve (AABB), symmetric push
function resolveRectangleCollisions(
  nodes: Node[],
  padding = PADDING,
  alpha = 1,
) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;

      const minDx = (a.w + b.w) / 2 + padding;
      const minDy = (a.h + b.h) / 2 + padding;

      const ox = minDx - Math.abs(dx);
      const oy = minDy - Math.abs(dy);

      if (ox > 0 && oy > 0) {
        // move along the axis with smaller overlap
        if (ox < oy) {
          const dir =
            dx === 0 ?
              Math.random() < 0.5 ?
                -1
              : 1
            : Math.sign(dx);
          const push = (ox / 2) * alpha;
          a.x -= dir * push;
          b.x += dir * push;
        } else {
          const dir =
            dy === 0 ?
              Math.random() < 0.5 ?
                -1
              : 1
            : Math.sign(dy);
          const push = (oy / 2) * alpha;
          a.y -= dir * push;
          b.y += dir * push;
        }
      }
    }
  }
}

export const getInitialPlacement = (shapes: Shape[]): Shape[] => {
  const rectangles = shapes.filter(
    (s): s is RectShape => s.type === "rectangle",
  );
  const links = shapes.filter((s): s is LinkShape => s.type === "linkline");

  // Build nodes keyed by rectangle id
  const nodeById = new Map<string, Node>();
  for (const r of rectangles) {
    nodeById.set(r.id.toString(), {
      id: r.id.toString(),
      w: r.w,
      h: r.h,
      // assuming coords are center-based; if top-left in your app, convert here
      x: r.coords[0],
      y: r.coords[1],
      degree: 0,
      neighbors: new Set<string>(),
      isOrphan: true,
    });
  }

  // Build undirected graph from links
  for (const l of links) {
    const a = nodeById.get(l.sourceId.toString());
    const b = nodeById.get(l.targetId.toString());
    if (!a || !b || a.id === b.id) continue;
    a.neighbors.add(b.id);
    b.neighbors.add(a.id);
  }

  for (const n of nodeById.values()) {
    n.degree = n.neighbors.size;
    n.isOrphan = n.degree === 0;
  }

  const allNodes = [...nodeById.values()];
  const linked = allNodes.filter((n) => !n.isOrphan);
  const orphans = allNodes.filter((n) => n.isOrphan);

  // Roots = highest degree first
  const roots = [...linked].sort(
    (a, b) => b.degree - a.degree || a.id.localeCompare(b.id),
  );

  // Ordered connected placement: multi-source BFS by root priority
  const orderedMain: Node[] = [];
  const visited = new Set<string>();

  for (const root of roots) {
    if (visited.has(root.id)) continue;
    const q: string[] = [root.id];
    visited.add(root.id);

    while (q.length) {
      const id = q.shift()!;
      const n = nodeById.get(id)!;
      orderedMain.push(n);

      const next = [...n.neighbors]
        .filter((nid) => !visited.has(nid))
        .sort((a, b) => {
          const na = nodeById.get(a)!;
          const nb = nodeById.get(b)!;
          return nb.degree - na.degree || a.localeCompare(b);
        });

      for (const nid of next) {
        visited.add(nid);
        q.push(nid);
      }
    }
  }

  // In case of weird disconnected linked leftovers
  for (const n of linked) {
    if (!visited.has(n.id)) orderedMain.push(n);
  }

  // Place main cluster
  const placed: Node[] = [];
  const placedById = new Map<string, Node>();

  if (orderedMain.length > 0) {
    // Root at center
    const first = orderedMain[0]!;
    first.x = 0;
    first.y = 0;
    placed.push(first);
    placedById.set(first.id, first);

    for (let i = 1; i < orderedMain.length; i++) {
      const n = orderedMain[i]!;

      // Anchor near already placed neighbors; fallback to main centroid
      const neighborPlaced = [...n.neighbors]
        .map((id) => placedById.get(id))
        .filter((v): v is Node => !!v);

      let ax = 0;
      let ay = 0;
      if (neighborPlaced.length) {
        for (const p of neighborPlaced) {
          ax += p.x;
          ay += p.y;
        }
        ax /= neighborPlaced.length;
        ay /= neighborPlaced.length;
      } else {
        const c = centroid(placed);
        ax = c.x;
        ay = c.y;
      }

      const pos = findSpotNear(n, ax, ay, placed);
      n.x = pos.x;
      n.y = pos.y;

      placed.push(n);
      placedById.set(n.id, n);
    }
  }

  // Place orphan cluster in bottom-right of main cluster (or near center if no main)
  const mainBounds = bounds(placed);
  const mainCenter = centroid(placed);

  const orphanTargetX =
    placed.length > 0 ?
      mainBounds.maxX + Math.max(260, mainBounds.width * 0.18)
    : 320;
  const orphanTargetY =
    placed.length > 0 ?
      mainBounds.maxY + Math.max(220, mainBounds.height * 0.18)
    : 260;

  const orphanOrdered = [...orphans].sort((a, b) => b.w * b.h - a.w * a.h);

  const orphanPlaced: Node[] = [];
  for (const o of orphanOrdered) {
    const anchor =
      orphanPlaced.length ?
        centroid(orphanPlaced)
      : { x: orphanTargetX, y: orphanTargetY };
    const pos = findSpotNear(o, anchor.x, anchor.y, placed);
    o.x = pos.x;
    o.y = pos.y;
    placed.push(o);
    orphanPlaced.push(o);
    placedById.set(o.id, o);
  }

  // Relaxation: keep compact, prevent overlaps, keep orphans in BR while mildly center-attracted
  for (let iter = 0; iter < RELAX_ITERS; iter++) {
    const cAll = centroid(placed);
    const cMain = placed.length ? mainCenter : cAll;
    const cOrphan =
      orphanPlaced.length ?
        centroid(orphanPlaced)
      : { x: orphanTargetX, y: orphanTargetY };

    for (const n of placed) {
      if (n.isOrphan) {
        // Strong pull to orphan clump target
        n.x += (cOrphan.x - n.x) * ORPHAN_TARGET_PULL;
        n.y += (cOrphan.y - n.y) * ORPHAN_TARGET_PULL;

        // Mild pull toward main center so clump doesn't drift excessively
        n.x += (cMain.x - n.x) * ORPHAN_CENTER_PULL;
        n.y += (cMain.y - n.y) * ORPHAN_CENTER_PULL;
      } else {
        // Keep main connected cluster compact
        n.x += (cMain.x - n.x) * MAIN_CLUSTER_PULL;
        n.y += (cMain.y - n.y) * MAIN_CLUSTER_PULL;
      }

      // Global tiny center pull for stability
      n.x += (0 - n.x) * GLOBAL_CENTER_PULL;
      n.y += (0 - n.y) * GLOBAL_CENTER_PULL;
    }

    resolveRectangleCollisions(placed, PADDING, 1);
  }

  // Write back
  const updatedRectangles = rectangles.map((r) => {
    const n = placedById.get(r.id.toString());
    if (!n) return r;
    return {
      ...r,
      coords: [Math.round(n.x), Math.round(n.y)] as [number, number],
    };
  });

  return [...updatedRectangles, ...links];
};
