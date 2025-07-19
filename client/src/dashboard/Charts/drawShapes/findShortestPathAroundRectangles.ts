// --- Type Definitions (Implicit via JS objects) ---
type Point = { x: number; y: number };
type Rectangle = {
  id: string | number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const cachedPaths = new Map<string, Point[]>();
// --- Shortest Path Function ---
export function findShortestPathAroundRectangles(
  startPoint: Point,
  endPoint: Point,
  rectangles: Rectangle[],
  padding: number,
) {
  const cacheKey = `${startPoint.x},${startPoint.y}-${endPoint.x},${endPoint.y}`;
  console.log(cacheKey);
  const cachedPath = cachedPaths.get(cacheKey);
  if (cachedPath) {
    return cachedPath;
  }

  // 1. Define all potential nodes for the graph
  const nodes = [startPoint, endPoint];
  const nodeMap = new Map<string, number>(); // To easily check if a point is already added
  nodeMap.set(`${startPoint.x},${startPoint.y}`, 0);
  nodeMap.set(`${endPoint.x},${endPoint.y}`, 1);
  let nodeIndex = 2;

  rectangles.forEach((rect) => {
    const corners = [
      { x: rect.x - padding, y: rect.y - padding }, // Top-left padded
      { x: rect.x + rect.width + padding, y: rect.y - padding }, // Top-right padded
      { x: rect.x + rect.width + padding, y: rect.y + rect.height + padding }, // Bottom-right padded
      { x: rect.x - padding, y: rect.y + rect.height + padding }, // Bottom-left padded
    ];
    corners.forEach((corner) => {
      const key = `${corner.x},${corner.y}`;
      if (!nodeMap.has(key)) {
        nodes.push(corner);
        nodeMap.set(key, nodeIndex++);
      }
    });
  });

  const numNodes = nodes.length;
  const adj: { node: number; weight: number }[][] = Array(numNodes)
    .fill(null)
    .map(() => []);

  // 2. Build the Visibility Graph (Edges)
  for (let i = 0; i < numNodes; i++) {
    for (let j = i + 1; j < numNodes; j++) {
      // Check if the segment between nodes[i] and nodes[j] is clear
      if (
        !isSegmentIntersectingRectangles(
          nodes[i]!,
          nodes[j]!,
          rectangles,
          padding / 2,
        )
      ) {
        // Use smaller padding for check? Or 0? Let's try padding/2 for robustness
        const dist = distance(nodes[i]!, nodes[j]!);
        adj[i]!.push({ node: j, weight: dist });
        adj[j]!.push({ node: i, weight: dist });
      }
    }
  }

  // 3. Run Dijkstra's Algorithm
  const dist = Array(numNodes).fill(Infinity);
  const prev = Array(numNodes).fill(null);
  const pq = new MinPriorityQueue<number>(); // Simple Priority Queue implementation

  dist[0] = 0; // Distance from start (node 0) to itself is 0
  pq.enqueue(0, 0); // Add start node with priority 0

  while (!pq.isEmpty()) {
    const { element: u, priority: d } = pq.dequeue();

    if (d > dist[u]) continue; // Skip if we found a shorter path already
    if (u === 1) break; // Reached the end node (node 1)

    for (const edge of adj[u]!) {
      const v = edge.node;
      const weight = edge.weight;
      if (dist[u] + weight < dist[v]) {
        dist[v] = dist[u] + weight;
        prev[v] = u;
        pq.enqueue(v, dist[v]);
      }
    }
  }

  // 4. Reconstruct the path
  const path: Point[] = [];
  let current: number | null = 1; // Start from the end node index
  if (prev[current] !== null || current === 0) {
    // Check if end node is reachable
    while (current !== null) {
      path.push(nodes[current]!);
      current = prev[current];
    }
    path.reverse(); // Reverse to get start -> end order
  }

  // If no path found via corners, check direct path last
  if (path.length === 0 || path[path.length - 1] !== endPoint) {
    if (
      !isSegmentIntersectingRectangles(
        startPoint,
        endPoint,
        rectangles,
        padding,
      )
    ) {
      return [startPoint, endPoint]; // Direct path is possible
    } else {
      // If Dijkstra failed and direct path blocked, return empty
      // This might happen if start/end are inside obstacles, though padding should prevent this mostly
      return [];
    }
  }
  cachedPaths.set(cacheKey, path);
  return path; // Return the reconstructed path
}

// --- Min Priority Queue Implementation (Simple) ---
class MinPriorityQueue<T> {
  elements: { element: T; priority: number }[] = [];
  enqueue(element: T, priority: number) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority); // Simple sort, inefficient for large graphs
  }
  dequeue() {
    return this.elements.shift()!;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
}

// --- Geometry Helper Functions ---

function distance(p1: Point, p2: Point) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Check orientation of ordered triplet (p, q, r)
// 0 --> p, q and r are collinear
// 1 --> Clockwise
// 2 --> Counterclockwise
function getOrientation(p: Point, q: Point, r: Point) {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 1e-9) return 0; // Collinear (within tolerance)
  return val > 0 ? 1 : 2; // Clockwise or Counterclockwise
}

// Check if point q lies on segment pr
function onSegment(p, q, r) {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

// Check if line segment 'p1q1' and 'p2q2' intersect.
function doSegmentsIntersect(p1, q1, p2, q2) {
  const o1 = getOrientation(p1, q1, p2);
  const o2 = getOrientation(p1, q1, q2);
  const o3 = getOrientation(p2, q2, p1);
  const o4 = getOrientation(p2, q2, q1);

  // General case
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  // Special Cases for collinearity
  // p1, q1 and p2 are collinear and p2 lies on segment p1q1
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  // p1, q1 and q2 are collinear and q2 lies on segment p1q1
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  // p2, q2 and p1 are collinear and p1 lies on segment p2q2
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  // p2, q2 and q1 are collinear and q1 lies on segment p2q2
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false; // Doesn't intersect
}

// Check if a line segment intersects a rectangle (considering padding)
function isSegmentIntersectingRect(p1, p2, rect, padding) {
  const rx = rect.x - padding;
  const ry = rect.y - padding;
  const rw = rect.width + 2 * padding;
  const rh = rect.height + 2 * padding;

  // Rectangle corners
  const topLeft = { x: rx, y: ry };
  const topRight = { x: rx + rw, y: ry };
  const bottomLeft = { x: rx, y: ry + rh };
  const bottomRight = { x: rx + rw, y: ry + rh };

  // Check intersection with rectangle sides
  if (doSegmentsIntersect(p1, p2, topLeft, topRight)) return true;
  if (doSegmentsIntersect(p1, p2, topRight, bottomRight)) return true;
  if (doSegmentsIntersect(p1, p2, bottomRight, bottomLeft)) return true;
  if (doSegmentsIntersect(p1, p2, bottomLeft, topLeft)) return true;

  // Optional: Check if segment is fully inside (though covered by intersection usually)
  // This is more complex and often unnecessary if segment intersection is robust
  // For simplicity, we rely on edge intersection checks.

  return false;
}

// Check if a segment intersects ANY of the rectangles
function isSegmentIntersectingRectangles(
  p1: Point,
  p2: Point,
  rectangles: Rectangle[],
  padding: number,
) {
  // Ignore check if endpoints are identical
  if (Math.abs(p1.x - p2.x) < 1e-9 && Math.abs(p1.y - p2.y) < 1e-9) {
    return false;
  }
  for (const rect of rectangles) {
    if (isSegmentIntersectingRect(p1, p2, rect, padding)) {
      return true;
    }
  }
  return false;
}
