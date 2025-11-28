import { fixIndent } from "@common/utils";
import type { SVGif } from "src/Testing";
import { toFixed } from "../../utils/toFixed";
import { getAnimationProperty } from "../getSVGif";
import type { SVGifParsedScene } from "../getSVGifParsedScenes";
import type { getSVGifTargetBBox } from "../getSVGifTargetBBox";

export const getSVGifZoomToAnimation = (
  viewport: { width: number; height: number },
  { bbox: rawBBox }: Pick<ReturnType<typeof getSVGifTargetBBox>, "bbox">,
  { svgDom, svgFileName }: Pick<SVGifParsedScene, "svgDom" | "svgFileName">,
  animation: Extract<SVGif.Animation, { type: "zoomToElement" }>,
  {
    sceneId,
    sceneIndex,
    totalDuration,
    getPercent,
    fromTime,
  }: {
    sceneIndex: number;
    sceneId: string;
    totalDuration: number;
    getPercent: (time: number, increment?: 0.1 | -0.1) => number;
    fromTime: number;
  },
  addToRootSvg: boolean,
) => {
  const { elementSelector, duration, maxScale = 3 } = animation;

  const rootGId = svgDom.querySelector(":scope > g")?.id;
  if (!rootGId) {
    throw `No root <g> element with id found in SVG file ${svgFileName}. "type" animations require the SVG to have a root <g> element with an id.`;
  }

  const zoomInDuration = 500;
  const zoomOutDuration = 500;
  const waitBeforeZoomOut = 300;
  const dwellDuration =
    duration - zoomInDuration - zoomOutDuration - waitBeforeZoomOut;
  if (dwellDuration < 500) {
    throw [
      `Duration ${duration}ms for "type" animation on element ${elementSelector} in SVG file ${svgFileName} is too short.`,
      `Must be at least ${zoomInDuration + zoomOutDuration + waitBeforeZoomOut + 500}ms`,
    ].join("\n");
  }
  const zoomInStartTime = fromTime;
  const zoomInEndTime = fromTime + zoomInDuration;
  const dwellEndTime = zoomInEndTime + dwellDuration;
  const zoomOutStartTime = dwellEndTime + waitBeforeZoomOut;
  const zoomOutEndTime = zoomOutStartTime + zoomOutDuration;

  const adjustedBBox = {
    x: rawBBox.x,
    y: rawBBox.y,
    height: rawBBox.height,
    width: rawBBox.width,
  };

  const xPadding = 50;
  const requiredScale = (svgDom.clientWidth - xPadding) / adjustedBBox.width;
  const effectiveScale = toFixed(Math.min(requiredScale, maxScale));
  const toPerc = getPercent(fromTime + duration);

  // Calculate center of the element
  const elementCenterX = toFixed(adjustedBBox.x + adjustedBBox.width / 2);
  const elementCenterY = toFixed(adjustedBBox.y + adjustedBBox.height / 2);

  // Calculate viewport center
  const viewportCenterX = toFixed(viewport.width / 2);
  const viewportCenterY = toFixed(viewport.height / 2);

  // Calculate translation needed to center the element
  const translateX = toFixed(viewportCenterX - elementCenterX);
  const translateY = toFixed(viewportCenterY - elementCenterY);

  const transformOrigin = `${elementCenterX}px ${elementCenterY}px`;

  const elemSelector = addToRootSvg ? ":scope" : `svg#${sceneId} g#${rootGId}`;

  /** Add root svg zoom in-out animation to the typed */
  const animProp = getAnimationProperty({
    animName: `scene-${sceneIndex}-type-zoom`,
    elemSelector,
    totalDuration,
    otherProps: `transform-origin: ${transformOrigin};`,
  });
  const style = fixIndent(`
    @keyframes scene-${sceneIndex}-type-zoom {
      ${getPercent(zoomInStartTime)}% { transform: translate(0px, 0px) scale(1);}
      ${getPercent(zoomInEndTime)}% { transform: translate(${translateX}px, ${translateY}px) scale(${effectiveScale}); }
      ${getPercent(zoomOutStartTime)}% { transform: translate(${translateX}px, ${translateY}px) scale(${effectiveScale}); }
      ${getPercent(zoomOutEndTime)}% { transform: translate(0px, 0px) scale(1); }
      ${toFixed(
        Math.min(100, toPerc + 0.1),
        4,
      )}% { transform: translate(0px, 0px) scale(1); }
    }
    ${animProp}
  `);
  return { style };
};
