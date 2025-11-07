import { fixIndent } from "@common/utils";
import { SVG_NAMESPACE } from "../domToSVG";
import { renderSvg } from "../text/textToSVG";
import { toFixed } from "../utils/toFixed";
import { addSVGifCaption } from "./addSVGifCaption";
import { getAnimationProperty } from "./getSVGif";
import { getSVGifTargetBBox } from "./getSVGifTargetBBox";
import type { SVGifParsedScene } from "./getSVGifParsedScenes";
import { getSVGifRevealKeyframes } from "./getSVGifRevealKeyframes";
import { getSVGifTypeAnimation } from "./animations/getSVGifTypeAnimation";

/**
 * Given an SVGifScenes, return the animations
 */
export const getSVGifAnimations = (
  { height, width }: { width: number; height: number },
  g: SVGGElement,
  parsedScenes: SVGifParsedScene[],
) => {
  const [x0, y0] = [width / 2, height];
  const cursorMovements: {
    fromPerc: number;
    toPerc: number;
    lingerPerc: number | undefined;
    target: [number, number];
  }[] = [];
  const totalDuration = parsedScenes.reduce(
    (acc, { animations }) =>
      acc + animations.reduce((a, { duration }) => a + duration, 0),
    0,
  );
  const getPercent = (ms: number, offset: 0 | 0.1 | -0.1 = 0) => {
    const perc = (ms / totalDuration) * 100;
    const result = Math.max(0, Math.min(100, perc));
    const resultWithOffset = result + offset;

    return toFixed(resultWithOffset);
  };
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
        const newDefs = document.createElementNS(SVG_NAMESPACE, "defs");
        svgDom.insertBefore(newDefs, svgDom.firstChild);
        defs = document.createElementNS(SVG_NAMESPACE, "defs");
        svgDom.insertBefore(defs, svgDom.firstChild);
      }
      return defs;
    };
    const appendStyle = (style: string) => {
      let styleElem = svgDom.querySelector<SVGStyleElement>("style");
      if (!styleElem) {
        styleElem = document.createElementNS(SVG_NAMESPACE, "style");
        const defs = getDefs();
        defs.appendChild(styleElem);
      }
      styleElem.textContent += style;
    };
    for (const [animationIndex, animation] of animations.entries()) {
      if (animation.type === "wait") {
      } else if (animation.type === "moveTo") {
        cursorMovements.push({
          fromPerc: Number(getPercent(currentPrevDuration)),
          toPerc: Number(getPercent(currentPrevDuration + animation.duration)),
          lingerPerc: undefined,
          target: animation.xy,
        });
      } else {
        const { type, duration, elementSelector } = animation;

        const { bbox, element } = getSVGifTargetBBox({
          elementSelector,
          svgDom,
          svgFileName,
          width,
          height,
        });
        const fromTime = currentPrevDuration;
        const fromPerc = getPercent(fromTime);
        if (type === "fadeIn" || type === "growIn") {
          const toTime = fromTime + duration;
          const toPerc = getPercent(toTime);
          sceneNodeAnimations.push({
            sceneId,
            elemSelector: elementSelector,
            keyframes: getSVGifRevealKeyframes({
              fromPerc,
              toPerc,
              mode: type === "fadeIn" ? "opacity" : "growIn",
              // mode: "top to bottom",
            }),
          });
        } else if (type === "type") {
          const parsedAnimations = getSVGifTypeAnimation(
            { height, width },
            { element, bbox },
            parsedScene,
            animation,
            { sceneId, sceneIndex, totalDuration, getPercent, fromTime },
          );
          sceneNodeAnimations.push(...parsedAnimations.sceneNodeAnimations);
          appendStyle(parsedAnimations.style);
          // const tSpansOrText = Array.from(
          //   element.querySelectorAll<SVGTSpanElement | SVGTextElement>(
          //     "tspan, text",
          //   ),
          // );
          // if (!tSpansOrText.length) {
          //   throw `No tspan elements found in element: ${elementSelector} in SVG file ${svgFileName}. "type" animations require the target element to contain one or more <tspan> elements.`;
          // }
          // const totalWidth = tSpansOrText.reduce(
          //   (acc, tspan) => acc + tspan.getComputedTextLength(),
          //   0,
          // );
          // const msPerPx = duration / totalWidth;
          // let currentXOffset = 0;
          // tSpansOrText.forEach((tspanOrText, i) => {
          //   const tspanWidth = tspanOrText.getComputedTextLength();
          //   const tspanDuration = tspanWidth * msPerPx;
          //   const toTime = fromTime + tspanDuration;
          //   const fromPerc = Number(getPercent(fromTime));
          //   const toPerc = Number(getPercent(toTime));
          //   sceneNodeAnimations.push({
          //     sceneId,
          //     elemSelector: `${elementSelector} ${tspanOrText.nodeName}:nth-of-type(${i + 1})`,
          //     keyframes: getSVGifRevealKeyframes({
          //       fromPerc,
          //       toPerc,
          //       mode: "left to right",
          //     }),
          //   });
          //   currentXOffset += tspanWidth;
          // });
          // /** Add root svg zoom in-out animation to the typed */
          // const animProp = getAnimationProperty({
          //   animName: `scene-${sceneIndex}-type-zoom`,
          //   elemSelector: `svg#${sceneId} g#${svgDom.querySelector(":scope > g")!.id}`,
          //   totalDuration,
          // });

          // const requiredScale = (svgDom.clientWidth * 0.8) / totalWidth;
          // const effectiveScale = toFixed(
          //   requiredScale,
          //   // Math.min(1.05, Math.max(1.02, requiredScale)),
          // );
          // const toPerc = getPercent(fromTime + duration);
          // const zoomedPerc1 = getPercent(fromTime + duration / 4);
          // const zoomedPerc2 = getPercent(fromTime + (duration / 4) * 3);

          // // Calculate center of the element
          // const elementCenterX = toFixed(bbox.x + bbox.width / 2);
          // const elementCenterY = toFixed(bbox.y + bbox.height / 2);

          // // Calculate viewport center
          // const viewportCenterX = toFixed(width / 2);
          // const viewportCenterY = toFixed(height / 2);

          // // Calculate translation needed to center the element
          // const translateX = toFixed(viewportCenterX - elementCenterX);
          // const translateY = toFixed(viewportCenterY - elementCenterY);

          // // const transformOriginX = toFixed(bbox.x + bbox.width / 2);
          // // const transformOriginY = toFixed(bbox.y + bbox.height / 2);
          // // const transformOrigin = `${translateX}px ${translateY}px`;

          // appendStyle(
          //   fixIndent(`
          //   @keyframes scene-${sceneIndex}-type-zoom {
          //     ${fromPerc}%    { transform: translate(0px, 0px) scale(1);}
          //     ${zoomedPerc1}% { transform: translate(${translateX}px, ${translateY}px) scale(${effectiveScale}); }
          //     ${zoomedPerc2}% { transform: translate(${translateX}px, ${translateY}px) scale(${effectiveScale}); }
          //     ${toPerc}%      { transform: translate(0px, 0px) scale(1); }
          //     ${toFixed(
          //       Math.min(100, toPerc + 0.1),
          //     )}% { transform: translate(0px, 0px) scale(1); }
          //   }
          //   ${animProp}
          // `),
          // );
        } else {
          const {
            type,
            lingerMs = 500,
            waitBeforeClick = 300,
            duration,
            elementSelector,
            offset,
          } = animation;

          const xOffset = offset?.x ?? Math.min(60, bbox.width / 2);
          const yOffset = offset?.y ?? Math.min(30, bbox.height / 2);
          const cx = bbox.x + xOffset;
          const cy = bbox.y + yOffset;

          const clickEndTime = currentPrevDuration + duration - waitBeforeClick;
          const nextAnimation =
            animations[animationIndex + 1] ||
            parsedScenes[sceneIndex + 1]?.animations[0];
          const anotherClickFollowing = nextAnimation?.type === "click";
          cursorMovements.push({
            fromPerc: getPercent(currentPrevDuration),
            toPerc: getPercent(clickEndTime),
            lingerPerc:
              !lingerMs || anotherClickFollowing ? undefined : (
                Number(
                  getPercent(Math.min(totalDuration, clickEndTime + lingerMs)),
                )
              ),
            target: [cx, cy],
          });

          if (type === "clickAppearOnHover") {
            const toPerc = getPercent(clickEndTime);
            /** Ensure it appears as the cursor enters the bbox */
            const xDistance = Math.abs(
              cx - (cursorMovements.at(-2)?.target[0] ?? x0),
            );
            const yDistance = Math.abs(
              cy - (cursorMovements.at(-2)?.target[1] ?? y0),
            );
            const distance = Math.sqrt(xDistance ** 2 + yDistance ** 2);
            const approxMsToEnter = Math.max(300, distance * 4);
            const appearTime = Math.max(
              fromTime,
              clickEndTime - approxMsToEnter,
            );
            const appearPerc = getPercent(appearTime);

            sceneNodeAnimations.push({
              sceneId,
              elemSelector: elementSelector,
              keyframes: getSVGifRevealKeyframes({
                fromPerc: appearPerc,
                toPerc,
                mode: "opacity",
              }),
            });
          }
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
          ${getAnimationProperty({ elemSelector: `#${sceneId} ${elemSelector}`, animName: animationName, totalDuration })}
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
        totalDuration,
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

  const firstTranslate = `transform: translate(${toFixed(x0)}px, ${toFixed(y0)}px)`;
  const cursorKeyframes = [`0% { opacity: 0; ${firstTranslate}; }`];
  const cursorMovementsFixed = cursorMovements.map((e) => ({
    ...e,
    target: e.target.map(toFixed),
  }));
  cursorMovementsFixed.forEach(
    ({ fromPerc, toPerc, lingerPerc, target: [x, y] }, i, arr) => {
      const translate = `transform: translate(${x}px, ${y}px)`;
      const prevTarget = arr[i - 1]?.target ?? [x0, y0].map(toFixed);
      const prevTranslate = `transform: translate(${prevTarget[0]}px, ${prevTarget[1]}px)`;
      cursorKeyframes.push(
        ...[
          `${toFixed(fromPerc)}% { opacity: 0; ${prevTranslate}; }`,
          `${toFixed(fromPerc) + 0.1}% { opacity: 1; ${prevTranslate}; }`,
          `${toFixed(toPerc)}% { opacity: 1; ${translate}; }`,
          `${toFixed(lingerPerc ?? toPerc + 0.1)}% { opacity: 0; ${translate}; }`,
        ],
      );
    },
  );
  return {
    cursorKeyframes,
    sceneAnimations,
    totalDuration,
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
