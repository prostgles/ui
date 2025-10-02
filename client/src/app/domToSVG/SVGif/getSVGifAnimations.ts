import { SVG_NAMESPACE } from "../domToSVG";
import { renderSvg } from "../text/textToSVG";
import type { parseSVGWithViewBox, SVGifScene } from "./getSVGif";

/**
 * Given an SVGifScenes, return the animations
 */
export const getSVGifAnimations = (
  { height, width }: { width: number; height: number },
  svg: SVGElement,
  parsedScenes: (ReturnType<typeof parseSVGWithViewBox> & SVGifScene)[],
) => {
  const cursorKeyframes = [`0% { opacity: 0; }`];
  const totalDuration = parsedScenes.reduce(
    (acc, { animations }) =>
      acc + animations.reduce((a, { duration }) => a + duration, 0),
    0,
  );
  const getPercent = (ms: number, offset: 0 | 0.1 | -0.1 = 0) => {
    const perc = (ms / totalDuration) * 100;
    const result = Math.max(0, Math.min(100, perc));
    const resultWithOffset = result + offset;

    return resultWithOffset.toFixed(2);
  };
  const sceneAnimations: {
    sceneId: string;
    svgName: string;
    keyframes: string[];
  }[] = [];
  let currentPrevDuration = 0;
  const prevSceneAnim = sceneAnimations.at(-1);
  for (const [
    sceneIndex,
    { svgFileName, animations, svgFile, svgDom },
  ] of parsedScenes.entries()) {
    if (!animations.length) {
      throw new Error(
        `No animations provided for scene ${sceneIndex} (${svgFileName}). Each scene must have at least one animation.`,
      );
    }
    const sceneId = `scene-${sceneIndex}`;
    const renderedSceneSVG = renderSvg(svgDom);
    appendSvgToSvg({ id: sceneId, svgFile }, svg);

    const sceneKeyframes: string[] = [];
    if (prevSceneAnim) {
      if (prevSceneAnim.svgName === svgFileName) {
        throw new Error("SVG file must change between scenes");
      }
    }
    if (currentPrevDuration) {
      sceneKeyframes.push(`0% { opacity: 0; }`);
      sceneKeyframes.push(
        `${getPercent(currentPrevDuration, -0.1)}% { opacity: 0; }`,
      );
    }

    sceneKeyframes.push(`${getPercent(currentPrevDuration)}% { opacity: 1; }`);
    for (const animation of animations) {
      if (animation.type === "wait") {
      } else {
        const {
          lingerMs = 500,
          waitBeforeClick = 300,
          duration,
          elementSelector,
          type,
        } = animation;
        const element = svgDom.querySelector<SVGGElement>(
          animation.elementSelector,
        );
        if (!element) {
          throw `Element not found: ${elementSelector} in SVG file ${svgFileName}`;
        }

        const bbox = element.getBBox();
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;

        const clickEndTime = currentPrevDuration + duration - waitBeforeClick;
        cursorKeyframes.push(
          ...[
            `${getPercent(
              currentPrevDuration,
            )}% { opacity: 0; transform: translate(${width / 2}px, ${height}px); }`,
            `${getPercent(
              clickEndTime,
            )}% { opacity: 1; transform: translate(${cx}px, ${cy}px); }`,
            `${getPercent(
              Math.min(totalDuration, clickEndTime + lingerMs),
            )}% { opacity: 0; transform: translate(${cx}px, ${cy}px); }`,
          ],
        );
      }
      currentPrevDuration += animation.duration;
    }

    const isLastScene = sceneIndex === parsedScenes.length - 1;
    sceneKeyframes.push(`${getPercent(currentPrevDuration)}% { opacity: 1; }`);
    if (!isLastScene) {
      sceneKeyframes.push(
        `${getPercent(currentPrevDuration, 0.1)}% { opacity: 0; }`,
      );
    }

    sceneAnimations.push({
      sceneId,
      svgName: svgFileName,
      keyframes: sceneKeyframes,
    });
    renderedSceneSVG.remove();
  }

  return { cursorKeyframes, sceneAnimations, totalDuration };
};

const appendSvgToSvg = (
  { svgFile, id }: { svgFile: string; id: string },
  svg: SVGElement,
) => {
  const img = document.createElementNS(SVG_NAMESPACE, "image");
  img.setAttribute("id", id);
  img.setAttribute("xmlns", SVG_NAMESPACE);
  img.setAttribute(
    "href",
    `data:image/svg+xml;utf8,${encodeURIComponent(svgFile)}`,
  );
  img.setAttribute("width", "100%");
  img.setAttribute("height", "100%");
  img.setAttribute("style", "opacity: 0;");
  svg.appendChild(img);
};
