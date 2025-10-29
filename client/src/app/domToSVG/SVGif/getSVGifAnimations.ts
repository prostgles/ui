import { fixIndent } from "@common/utils";
import { SVG_NAMESPACE } from "../domToSVG";
import { renderSvg } from "../text/textToSVG";
import { toFixed } from "../utils/toFixed";
import { addSVGifCaption } from "./addSVGifCaption";
import { getAnimationProperty } from "./getSVGif";
import { getSVGifTargetBBox } from "./getSVGifTargetBBox";
import type { SVGifParsedScene } from "./getSVGifParsedScenes";

/**
 * Given an SVGifScenes, return the animations
 */
export const getSVGifAnimations = (
  { height, width }: { width: number; height: number },
  g: SVGGElement,
  parsedScenes: SVGifParsedScene[],
  loop: boolean,
) => {
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

  for (const [
    sceneIndex,
    { svgFileName, animations, svgDom, caption },
  ] of parsedScenes.entries()) {
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

    const sceneNodeAnimations: {
      sceneId: string;
      elemSelector: string;
      keyframes: string[];
    }[] = [];
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
        const {
          type,
          lingerMs = 500,
          waitBeforeClick = 300,
          duration,
          elementSelector,
          offset,
        } = animation;

        const { bbox, element } = getSVGifTargetBBox({
          elementSelector,
          svgDom,
          svgFileName,
          width,
          height,
        });
        if (type === "reveal-list" || type === "growIn") {
          const { type } = animation;
          const fromTime = currentPrevDuration;
          const toTime = fromTime + duration;
          const fromPerc = getPercent(fromTime);
          const toPerc = getPercent(toTime);
          sceneNodeAnimations.push({
            sceneId,
            elemSelector: elementSelector,
            keyframes: getRevealKeyframes({
              fromPerc,
              toPerc,
              mode: type === "reveal-list" ? "opacity" : "growIn",
              // mode: "top to bottom",
            }),
          });
        } else if (animation.type === "type") {
          const tSpansOrText = Array.from(
            element.querySelectorAll<SVGTSpanElement | SVGTextElement>(
              "tspan, text",
            ),
          );
          if (!tSpansOrText.length) {
            throw `No tspan elements found in element: ${elementSelector} in SVG file ${svgFileName}. "type" animations require the target element to contain one or more <tspan> elements.`;
          }
          const totalWidth = tSpansOrText.reduce(
            (acc, tspan) => acc + tspan.getComputedTextLength(),
            0,
          );
          const msPerPx = duration / totalWidth;
          let currentXOffset = 0;
          tSpansOrText.forEach((tspanOrText, i) => {
            const tspanWidth = tspanOrText.getComputedTextLength();
            const tspanDuration = tspanWidth * msPerPx;
            const fromTime = currentPrevDuration;
            const toTime = fromTime + tspanDuration;
            const fromPerc = Number(getPercent(fromTime));
            const toPerc = Number(getPercent(toTime));
            sceneNodeAnimations.push({
              sceneId,
              elemSelector: `${elementSelector} ${tspanOrText.nodeName}:nth-of-type(${i + 1})`,
              keyframes: getRevealKeyframes({
                fromPerc,
                toPerc,
                mode: "left to right",
              }),
            });
            currentXOffset += tspanWidth;
          });
        } else {
          const xOffset = offset?.x ?? bbox.width / 2;
          const yOffset = offset?.y ?? bbox.height / 2;
          const cx = bbox.x + xOffset;
          const cy = bbox.y + yOffset;

          const clickEndTime = currentPrevDuration + duration - waitBeforeClick;
          const nextAnimation =
            animations[animationIndex + 1] ||
            parsedScenes[sceneIndex + 1]?.animations[0];
          const anotherClickFollowing = nextAnimation?.type === "click";
          cursorMovements.push({
            fromPerc: Number(getPercent(currentPrevDuration)),
            toPerc: Number(getPercent(clickEndTime)),
            lingerPerc:
              !lingerMs || anotherClickFollowing ? undefined : (
                Number(
                  getPercent(Math.min(totalDuration, clickEndTime + lingerMs)),
                )
              ),
            target: [cx, cy],
          });
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
      sceneKeyframes.push(`${getPercent(currentPrevDuration, 0.1)}% ${hidden}`);
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

  const [x0, y0] = [width / 2, height];
  const firstTranslate = `transform: translate(${toFixed(x0)}px, ${toFixed(y0)}px)`;
  const cursorKeyframes = [`0% { opacity: 0; ${firstTranslate}; }`];
  cursorMovements.forEach(
    ({ fromPerc, toPerc, lingerPerc, target: [x, y] }, i, arr) => {
      const translate = `transform: translate(${x}px, ${y}px)`;
      const prevTarget = arr[i - 1]?.target ?? [x0, y0].map(toFixed);
      const prevTranslate = `transform: translate(${prevTarget[0]}px, ${prevTarget[1]}px)`;
      cursorKeyframes.push(
        ...[
          `${toFixed(fromPerc - 0.1)}% { opacity: 0; ${prevTranslate}; }`,
          `${toFixed(fromPerc)}% { opacity: 1; ${prevTranslate}; }`,
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

const appendSvgToSvg = (
  { svgFile, id, svgDom }: { svgFile: string; id: string; svgDom: SVGElement },
  g: SVGGElement,
) => {
  // const img = document.createElementNS(SVG_NAMESPACE, "image");
  // img.setAttribute("id", id);
  // img.setAttribute("xmlns", SVG_NAMESPACE);
  // img.setAttribute(
  //   "href",
  //   `data:image/svg+xml;utf8,${encodeURIComponent(svgFile)}`,
  // );
  // img.setAttribute("width", "100%");
  // img.setAttribute("height", "100%");
  // img.setAttribute("style", "opacity: 0;");
  // g.appendChild(img);

  // const wrappingG = document.createElementNS(SVG_NAMESPACE, "g");
  // wrappingG.setAttribute("id", id);
  // wrappingG.style.opacity = "0";
  // wrappingG.append(...Array.from(svgDom.children));
  svgDom.setAttribute("id", id);
  g.appendChild(svgDom);

  return {
    remove: () => {
      svgDom.remove();
    },
  };
};

const visible = "{ opacity: 1; visibility: visible; }";
const hidden = "{ opacity: 0; visibility: hidden; }";

const getRevealKeyframes = ({
  fromPerc,
  toPerc,
  mode,
}: {
  fromPerc: number;
  toPerc: number;
  mode: "top to bottom" | "left to right" | "opacity" | "growIn";
}) => {
  if (mode === "growIn") {
    return [
      !fromPerc ? "" : (
        `0% { opacity: 0; transform: scale(0.2); transform-origin: center; }`
      ),
      `${toFixed(fromPerc)}% { opacity: 0; transform: scale(0.2); transform-origin: center; }`,
      `${toFixed(fromPerc + 0.1)}% { opacity: 0; transform: scale(0.2); transform-origin: center; }`,
      `${toFixed(toPerc)}% { opacity: 1; transform: scale(1); transform-origin: center; }`,
      toPerc === 100 ? "" : (
        `100% { opacity: 1; transform: scale(1); transform-origin: center; }`
      ),
    ].filter(Boolean);
  }
  if (mode === "opacity") {
    return [
      !fromPerc ? "" : `0% { opacity: 0; }`,
      `${toFixed(fromPerc)}% { opacity: 0; }`,
      `${toFixed(fromPerc + 0.1)}% { opacity: 0; }`,
      `${toFixed(toPerc)}% { opacity: 1; }`,
      toPerc === 100 ? "" : `100% { opacity: 1; }`,
    ].filter(Boolean);
  }
  const clippedInset =
    mode === "top to bottom" ? `inset(0 0 100% 0)` : `inset(0 100% 0 0)`;
  return [
    !fromPerc ? "" : `0% { opacity: 0; clip-path: ${clippedInset} }`,
    `${toFixed(fromPerc)}% { opacity: 0; clip-path: ${clippedInset} }`,
    `${toFixed(fromPerc + 0.1)}% { opacity: 1; clip-path: ${clippedInset} }`,
    `${toFixed(toPerc)}% { opacity: 1;  clip-path: inset(0 0 0 0);  }`,
    toPerc === 100 ? "" : `100% { opacity: 1; clip-path: inset(0 0 0 0); }`,
  ].filter(Boolean);
};
