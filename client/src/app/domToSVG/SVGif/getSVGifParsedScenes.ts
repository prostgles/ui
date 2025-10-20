import type { SVGif } from "src/Testing";

const parseSVGWithViewBox = (
  svgFileName: string,
  svgFiles: Map<string, string>,
) => {
  if (!svgFileName) {
    throw "SVG file name is empty";
  }
  const svgFile = svgFiles.get(svgFileName + ".svg");
  if (!svgFile) {
    throw `SVG file not found: ${svgFileName} \nExpecting one of: ${svgFiles.keys().toArray()}`;
  }
  const parsedSVG = new DOMParser().parseFromString(svgFile, "image/svg+xml");
  const viewBox = parsedSVG.documentElement.getAttribute("viewBox");
  if (!viewBox) {
    throw `SVG file ${svgFileName} does not have a viewBox attribute`;
  }

  const width = Number(viewBox.split(" ")[2]);
  const height = Number(viewBox.split(" ")[3]);
  if (!width || !height) {
    throw `Invalid viewBox dimensions in SVG file ${svgFileName}`;
  }

  return {
    svgDom: parsedSVG.documentElement as unknown as SVGElement,
    width,
    height,
    viewBox,
    svgFile,
  };
};

export type SVGifParsedScene = ReturnType<typeof parseSVGWithViewBox> &
  SVGif.Scene;

export const getSVGifParsedScenes = (
  scenes: SVGif.Scene[],
  svgFiles: Map<string, string>,
) => {
  const parsedScenes = scenes.map((scene) => ({
    ...scene,
    ...parseSVGWithViewBox(scene.svgFileName, svgFiles),
  }));
  const firstScene = parsedScenes[0];
  if (!firstScene) {
    throw "No scenes provided";
  }

  return { parsedScenes, firstScene };
};
