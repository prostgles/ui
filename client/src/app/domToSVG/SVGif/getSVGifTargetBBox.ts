export const getSVGifTargetBBox = ({
  elementSelector,
  svgDom,
  svgFileName,
  width,
  height,
  nth = 0,
}: {
  elementSelector: string;
  nth: number | undefined;
  svgDom: SVGElement;
  svgFileName: string;
  width: number;
  height: number;
}) => {
  const elements = Array.from(
    svgDom.querySelectorAll<SVGGElement>(elementSelector),
  );
  const element = elements.at(nth);
  if (!element) {
    throw (
      `Element not found: ${elementSelector}${nth ? ` nth(${nth})` : ""} in SVG file ${svgFileName}` +
      (nth ? `. Total matches: ${elements.length}` : "")
    );
  }

  const bbox = element.getBBox();

  /* Clamp width and height to be within visible bounds */
  bbox.x = Math.max(0, Math.min(bbox.x, width));
  bbox.y = Math.max(0, Math.min(bbox.y, height));
  bbox.width = Math.max(0, Math.min(bbox.width, width - bbox.x));
  bbox.height = Math.max(0, Math.min(bbox.height, height - bbox.y));

  return { bbox, element };
};
