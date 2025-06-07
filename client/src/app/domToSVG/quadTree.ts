type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const encodeQuadtree = (
  bbox: BoundingBox,
  { maxX, maxY }: { maxX: number; maxY: number },
  maxDepth = 10,
) => {
  const x1 = bbox.x;
  const y1 = bbox.y;
  const x2 = bbox.x + bbox.width;
  const y2 = bbox.y + bbox.height;

  let code = "";
  let minX = 0,
    minY = 0;
  for (let depth = 0; depth < maxDepth; depth++) {
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    // Determine which quadrant contains the ENTIRE bounding box
    let quadrant = -1;

    if (x2 <= midX && y2 <= midY)
      quadrant = 0; // top-left
    else if (x1 >= midX && y2 <= midY)
      quadrant = 1; // top-right
    else if (x2 <= midX && y1 >= midY)
      quadrant = 2; // bottom-left
    else if (x1 >= midX && y1 >= midY) quadrant = 3; // bottom-right

    // If box doesn't fit entirely in one quadrant, stop
    if (quadrant === -1) break;

    code += quadrant.toString();

    // Update bounds for next iteration
    if (quadrant === 0 || quadrant === 2) maxX = midX;
    else minX = midX;
    if (quadrant === 0 || quadrant === 1) maxY = midY;
    else minY = midY;

    // Stop if we've reached sufficient precision
    if (maxX - minX <= 0.5 && maxY - minY <= 0.5) break;
  }

  return code;
};

const decodeQuadtree = (code: string) => {
  let minX = 0,
    minY = 0,
    maxX = 20,
    maxY = 20;

  for (const char of code) {
    const quadrant = parseInt(char);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    if (quadrant === 0) {
      maxX = midX;
      maxY = midY;
    } else if (quadrant === 1) {
      minX = midX;
      maxY = midY;
    } else if (quadrant === 2) {
      maxX = midX;
      minY = midY;
    } else if (quadrant === 3) {
      minX = midX;
      minY = midY;
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const isQuadTreeOverlapping = (code1: string, code2: string) => {
  // Check if one is a prefix of the other (hierarchical containment)
  return code1.startsWith(code2) || code2.startsWith(code1);
};
