import { fixIndent } from "@common/utils";
import type { SVGif } from "src/Testing";
import { SVG_NAMESPACE } from "../domToSVG";
import { addSVGifPointer } from "./addSVGifPointer";
import { addSVGifTimelineControls } from "./addSVGifTimelineControls";
import { getSVGifAnimations } from "./getSVGifAnimations";
import { getSVGifParsedScenes } from "./getSVGifParsedScenes";

export const getSVGif = (
  scenes: SVGif.Scene[],
  svgFiles: Map<string, string>,
  loop = true,
) => {
  const { parsedScenes, firstScene } = getSVGifParsedScenes(scenes, svgFiles);
  const { viewBox, width, height } = firstScene;
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("xmlns", SVG_NAMESPACE);
  svg.setAttribute("viewBox", viewBox);
  const style = document.createElementNS(SVG_NAMESPACE, "style");
  svg.appendChild(style);
  const appendStyle = (s: string) => {
    style.textContent += "\n\n" + fixIndent(s);
  };
  const g = document.createElementNS(SVG_NAMESPACE, "g");
  g.setAttribute("id", "all-scenes");
  svg.appendChild(g);

  const { cursorKeyframes, sceneAnimations, totalDuration } =
    getSVGifAnimations({ width, height }, g, parsedScenes, loop);

  const getThisAnimationProperty = (
    args: Omit<
      Parameters<typeof getAnimationProperty>[0],
      "totalDuration" | "loop"
    >,
    onlyValue?: boolean,
  ) => getAnimationProperty({ ...args, totalDuration, loop }, onlyValue);

  sceneAnimations.forEach(({ sceneId, keyframes }) => {
    const animationName = `scene-${sceneId}-anim`;
    appendStyle(`
      @keyframes ${animationName} {
      ${keyframes.map((v) => `  ${v}`).join("\n")}
      }
      ${getThisAnimationProperty({ elemSelector: `#${sceneId}`, animName: animationName })}
    `);
  });

  addSVGifTimelineControls({
    width,
    height,
    appendStyle,
    g,
    totalDuration,
    sceneAnimations,
  });
  addSVGifPointer({ cursorKeyframes, g, appendStyle, totalDuration });
  // document.body.appendChild(svg); // debugging
  const xmlSerializer = new XMLSerializer();
  const svgString = xmlSerializer.serializeToString(svg);
  return svgString;
};

export const getAnimationProperty = (
  {
    elemSelector,
    animName,
    loop,
    totalDuration,
  }: {
    elemSelector: string;
    animName: string;
    totalDuration: number;
    loop?: boolean;
  },
  onlyValue = false,
) => {
  const value = `animation: ${animName} ${totalDuration}ms ease-in-out ${
    loop ? "infinite" : "forwards"
  };`;
  if (onlyValue) return value;
  return fixIndent(`
      ${elemSelector} {
        ${value}
      }
    `);
};
