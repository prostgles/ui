import { SVG_NAMESPACE } from "./domToSVG";

export const addFragmentViewBoxes = (svg: SVGSVGElement, padding = 10) => {
  // Ensure the SVG has a viewBox defined (needed for calculations)
  if (!svg.hasAttribute("viewBox")) {
    throw new Error("SVG must have a viewBox attribute");
  }
  if (!svg.isConnected) {
    throw new Error("SVG must be in the DOM for bbox calculations");
  }

  // Iterate over <g> elements with a data-command attribute
  const groups = svg.querySelectorAll<SVGGElement>("g[data-command]");

  groups.forEach((g) => {
    const cmd = g.getAttribute("data-command");
    if (!cmd) return;

    const bbox = g.getBBox();

    const x = bbox.x - padding;
    const y = bbox.y - padding;
    const w = bbox.width + 2 * padding;
    const h = bbox.height + 2 * padding;

    const view = document.createElementNS(SVG_NAMESPACE, "view");
    const id = cmd.replace(/\./g, "_");
    if (svg.querySelector(`view#${id}`)) {
      console.warn(`View ID collision for ${id}`);
      return;
    }
    view.setAttribute("id", id);
    view.setAttribute("viewBox", [x, y, w, h].map(Math.round).join(" "));

    svg.appendChild(view);
  });
  /**
   * Ensures the img tag size matches the viewBox size when using fragment identifiers
   */
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
};
