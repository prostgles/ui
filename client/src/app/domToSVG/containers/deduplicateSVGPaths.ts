export const deduplicateSVGPaths = (svgElement: SVGElement) => {
  // Get or create defs element
  let defs = svgElement.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svgElement.insertBefore(defs, svgElement.firstChild);
  }

  // Map to track identical paths: key = path signature, value = { id, count }
  const pathMap = new Map();

  // Find all path elements (excluding those already in defs)
  const paths = Array.from(
    svgElement.querySelectorAll<SVGPathElement>("path:not(defs path)"),
  );

  paths.forEach((path) => {
    // Create a signature from the path's key attributes
    const signature = createPathSignature(path);

    if (pathMap.has(signature)) {
      // Duplicate found - replace with <use>
      const { id } = pathMap.get(signature);
      replaceWithUse(path, id);
    } else {
      // First occurrence - move to defs if beneficial
      const id = `path-${pathMap.size}`;
      pathMap.set(signature, { id, element: path });
    }
  });

  // Move paths that appear multiple times to defs
  let deduplicatedCount = 0;
  pathMap.forEach(({ id, element }, signature) => {
    // Count how many times this signature appears
    const occurrences = paths.filter(
      (p) => createPathSignature(p) === signature,
    ).length;

    if (occurrences > 1) {
      moveToDefsAndReplaceAll(element, id, signature, paths, defs);
      deduplicatedCount++;
    }
  });

  return {
    deduplicatedCount,
    totalPaths: paths.length,
  };
};

const createPathSignature = (path: SVGPathElement) => {
  // Create a unique signature based on path data and styling attributes
  // Exclude transform and position attributes
  const d = path.getAttribute("d") || "";
  // const fill = path.getAttribute("fill") || "";
  // const stroke = path.getAttribute("stroke") || "";
  // const strokeWidth = path.getAttribute("stroke-width") || "";
  // const fillRule = path.getAttribute("fill-rule") || "";
  // const strokeLinecap = path.getAttribute("stroke-linecap") || "";
  // const strokeLinejoin = path.getAttribute("stroke-linejoin") || "";
  // const opacity = path.getAttribute("opacity") || "";
  // const fillOpacity = path.getAttribute("fill-opacity") || "";
  // const strokeOpacity = path.getAttribute("stroke-opacity") || "";

  return JSON.stringify({
    d,
    // fill,
    // stroke,
    // strokeWidth,
    // fillRule,
    // strokeLinecap,
    // strokeLinejoin,
    // opacity,
    // fillOpacity,
    // strokeOpacity,
  });
};

const moveToDefsAndReplaceAll = (
  originalPath: SVGPathElement,
  id,
  signature: string,
  allPaths: SVGPathElement[],
  defs: SVGDefsElement,
) => {
  // Clone the path for defs (without transform)
  const defPath = originalPath.cloneNode(true) as SVGPathElement;
  defPath.setAttribute("id", id);
  defPath.removeAttribute("transform");
  defs.appendChild(defPath);

  // Replace all matching paths with <use> elements
  allPaths.forEach((path) => {
    if (createPathSignature(path) === signature) {
      replaceWithUse(path, id);
    }
  });
};

const replaceWithUse = (path: SVGPathElement, refId: string) => {
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${refId}`);
  use.setAttribute("href", `#${refId}`);

  // Preserve transform and position attributes
  const preserveAttrs = ["transform", "x", "y", "class", "id", "data-*"];
  preserveAttrs.forEach((attr) => {
    if (path.hasAttribute(attr)) {
      use.setAttribute(attr, path.getAttribute(attr));
    }
  });

  // Copy data attributes
  Array.from(path.attributes).forEach((attr) => {
    if (attr.name.startsWith("data-")) {
      use.setAttribute(attr.name, attr.value);
    }
  });

  const parent = path.parentNode;
  if (!parent) {
    return;
    // throw new Error("Path element has no parent node.");
  }

  parent.replaceChild(use, path);
};
