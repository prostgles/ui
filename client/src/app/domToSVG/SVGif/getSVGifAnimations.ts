import { fixIndent } from "@common/utils";
import { SVG_NAMESPACE } from "../domToSVG";
import { renderSvg } from "../text/textToSVG";
import { toFixed } from "../utils/toFixed";
import { addSVGifCaption } from "./addSVGifCaption";
import { getSVGifCursorAnimationHandler } from "./animations/getSVGifCursorAnimationHandler";
import { getSVGifTypeAnimation } from "./animations/getSVGifTypeAnimation";
import { getSVGifZoomToAnimation } from "./animations/getSVGifZoomToAnimation";
import { getAnimationProperty } from "./getSVGif";
import type { SVGifParsedScene } from "./getSVGifParsedScenes";
import { getSVGifRevealKeyframes } from "./getSVGifRevealKeyframes";
import { getSVGifTargetBBox } from "./getSVGifTargetBBox";

/**
 * Given an SVGifScenes, return the animations
 */
export const getSVGifAnimations = (
  { height, width }: { width: number; height: number },
  g: SVGGElement,
  parsedScenes: SVGifParsedScene[],
) => {
  const totalSvgifDuration = parsedScenes.reduce(
    (acc, { animations }) =>
      acc + animations.reduce((a, { duration }) => a + duration, 0),
    0,
  );
  const getPercent = (ms: number, offset: 0 | 0.1 | -0.1 = 0) => {
    const perc = (ms / totalSvgifDuration) * 100;
    const result = Math.max(0, Math.min(100, perc));
    const resultWithOffset = result + offset;

    return toFixed(resultWithOffset, 4);
  };
  const cursorHandler = getSVGifCursorAnimationHandler({
    getPercent,
    parsedScenes,
    totalSvgifDuration,
    width,
    height,
  });

  const sceneAnimations: {
    sceneId: string;
    svgName: string;
    startMs: number;
    duration: number;
    keyframes: string[];
  }[] = [];
  let currentPrevDuration = 0;
  const prevSceneAnim = sceneAnimations.at(-1);

  for (const [sceneIndex, parsedScene] of parsedScenes.entries()) {
    const { svgFileName, animations, svgDom, caption } = parsedScene;
    if (!animations.length) {
      throw new Error(
        `No animations provided for scene ${sceneIndex} (${svgFileName}). Each scene must have at least one animation.`,
      );
    }
    const sceneId = `scene-${sceneIndex}`;
    const sceneStartMs = currentPrevDuration;
    const sceneFromPercent = getPercent(currentPrevDuration);

    const renderedSceneSVG = renderSvg(svgDom);

    const sceneKeyframes: string[] = [];
    if (prevSceneAnim) {
      if (prevSceneAnim.svgName === svgFileName) {
        throw new Error("SVG file must change between scenes");
      }
    }
    if (currentPrevDuration) {
      sceneKeyframes.push(`0% ${hidden}`);
      sceneKeyframes.push(
        `${getPercent(currentPrevDuration, -0.1)}% ${hidden}`,
      );
    }

    sceneKeyframes.push(`${getPercent(currentPrevDuration)}% ${visible}`);

    const sceneNodeAnimations: SceneNodeAnimation[] = [];
    let sceneNodeAnimationsStyle = "";
    const getDefs = () => {
      let defs = svgDom.querySelector("defs");
      if (!defs) {
        // const newDefs = document.createElementNS(SVG_NAMESPACE, "defs");
        // svgDom.insertBefore(newDefs, svgDom.firstChild);
        defs = document.createElementNS(SVG_NAMESPACE, "defs");
        svgDom.insertBefore(defs, svgDom.firstChild);
      }
      return defs;
    };
    let styleElem = svgDom.querySelector<SVGStyleElement>("style");
    const appendStyle = (style: string) => {
      if (!styleElem) {
        styleElem = document.createElementNS(SVG_NAMESPACE, "style");
        const defs = getDefs();
        defs.appendChild(styleElem);
      }
      console.log("Appending style:", style);
      styleElem.textContent += style;
    };
    for (const [animationIndex, animation] of animations.entries()) {
      const bboxInfo =
        animation.type !== "moveTo" && animation.type !== "wait" ?
          getSVGifTargetBBox({
            elementSelector: animation.elementSelector,
            svgDom,
            svgFileName,
            width,
            height,
          })
        : undefined;
      if (animation.type === "wait") {
      } else if (
        animation.type === "click" ||
        animation.type === "clickAppearOnHover" ||
        animation.type === "moveTo"
      ) {
        cursorHandler.addAnimation({
          currentPrevDuration,
          animation,
          animationIndex,
          animations,
          bbox: bboxInfo?.bbox,
          sceneIndex,
          svgFileName,
          sceneNodeAnimations,
          sceneId,
        });
      } else {
        const { duration, elementSelector } = animation;
        if (!bboxInfo) throw new Error("Missing bboxInfo");
        const { bbox, element } = bboxInfo;
        const fromTime = currentPrevDuration;
        const fromPerc = getPercent(fromTime);
        if (animation.type === "fadeIn" || animation.type === "growIn") {
          const toTime = fromTime + duration;
          const toPerc = getPercent(toTime);
          sceneNodeAnimations.push({
            sceneId,
            elemSelector: elementSelector,
            keyframes: getSVGifRevealKeyframes({
              fromPerc,
              toPerc,
              mode: animation.type === "fadeIn" ? "opacity" : "growIn",
              // mode: "top to bottom",
            }),
          });
        } else if (animation.type === "type") {
          const parsedAnimations = getSVGifTypeAnimation(
            { height, width },
            { element, bbox },
            parsedScene,
            animation,
            {
              sceneId,
              sceneIndex,
              totalDuration: totalSvgifDuration,
              getPercent,
              fromTime,
            },
          );
          sceneNodeAnimations.push(...parsedAnimations.sceneNodeAnimations);
          appendStyle(parsedAnimations.style);

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (animation.type === "zoomToElement") {
          const parsedAnimations = getSVGifZoomToAnimation(
            { height, width },
            { bbox },
            parsedScene,
            animation,
            {
              sceneId,
              sceneIndex,
              totalDuration: totalSvgifDuration,
              getPercent,
              fromTime,
            },
          );
          appendStyle(parsedAnimations.style);
        }
      }
      currentPrevDuration += animation.duration;
    }

    if (sceneNodeAnimations.length) {
      sceneNodeAnimationsStyle += "\n";
      let nodeAnimIndex = 0;
      sceneNodeAnimations.forEach(({ sceneId, elemSelector, keyframes }) => {
        nodeAnimIndex++;
        const animationName = `node-${sceneId}-anim-${nodeAnimIndex}`;
        sceneNodeAnimationsStyle += "\n";
        sceneNodeAnimationsStyle += fixIndent(`
          @keyframes ${animationName} {
          ${keyframes.map((v) => `  ${v}`).join("\n")}
          }
          ${getAnimationProperty({ elemSelector: `#${sceneId} ${elemSelector}`, animName: animationName, totalDuration: totalSvgifDuration })}
        `);
      });

      appendStyle(sceneNodeAnimationsStyle);
    }

    if (caption) {
      addSVGifCaption({
        svgDom,
        appendStyle,
        width,
        height,
        caption,
        fromPerc: sceneFromPercent,
        toPerc: getPercent(currentPrevDuration),
        totalDuration: totalSvgifDuration,
        sceneId,
      });
    }
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgDom);
    appendSvgToSvg({ id: sceneId, svgFile: svgString, svgDom }, g);

    const isLastScene = sceneIndex === parsedScenes.length - 1;
    sceneKeyframes.push(`${getPercent(currentPrevDuration)}% ${visible}`);
    if (!isLastScene) {
      const toPerc = getPercent(currentPrevDuration, 0.1);
      sceneKeyframes.push(`${getPercent(currentPrevDuration, 0.1)}% ${hidden}`);
      if (toPerc < 100) {
        sceneKeyframes.push(`100% ${hidden}`);
      }
    }

    sceneAnimations.push({
      sceneId,
      startMs: sceneStartMs,
      duration: currentPrevDuration - sceneStartMs,
      svgName: svgFileName,
      keyframes: sceneKeyframes,
    });
    renderedSceneSVG.remove();
  }
  const { cursorKeyframes } = cursorHandler.getCursorKeyframes();
  return {
    cursorKeyframes,
    sceneAnimations,
    totalDuration: totalSvgifDuration,
  };
};

export type SceneNodeAnimation = {
  sceneId: string;
  elemSelector: string;
  keyframes: string[];
};

const appendSvgToSvg = (
  { svgFile, id, svgDom }: { svgFile: string; id: string; svgDom: SVGElement },
  g: SVGGElement,
) => {
  svgDom.setAttribute("id", id);
  g.appendChild(svgDom);

  return {
    remove: () => {
      svgDom.remove();
    },
  };
};

const visible = "{  visibility: visible; }";
const hidden = "{  visibility: hidden; }";
