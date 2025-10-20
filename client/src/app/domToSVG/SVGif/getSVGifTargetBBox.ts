export const getSVGifTargetBBox = ({
  elementSelector,
  svgDom,
  svgFileName,
  width,
  height,
}: {
  elementSelector: string;
  svgDom: SVGElement;
  svgFileName: string;
  width: number;
  height: number;
}) => {
  const element = svgDom.querySelector<SVGGElement>(elementSelector);
  if (!element) {
    throw `Element not found: ${elementSelector} in SVG file ${svgFileName}`;
  }

  const bbox = element.getBBox();

  /* Clamp width and height to be within visible bounds */
  bbox.x = Math.max(0, Math.min(bbox.x, width));
  bbox.y = Math.max(0, Math.min(bbox.y, height));
  bbox.width = Math.max(0, Math.min(bbox.width, width - bbox.x));
  bbox.height = Math.max(0, Math.min(bbox.height, height - bbox.y));

  return { bbox, element };
};
