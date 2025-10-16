import type { SVGif } from "src/Testing";
import { SVG_NAMESPACE } from "../domToSVG";
import { renderSvg } from "../text/textToSVG";
import { getAnimationProperty, type parseSVGWithViewBox } from "./getSVGif";
import { getSVGifTargetBBox } from "./getSVGifTargetBBox";
import { fixIndent } from "@common/utils";

/**
 * Given an SVGifScenes, return the animations
 */
export const getSVGifAnimations = (
  { height, width }: { width: number; height: number },
  g: SVGGElement,
  parsedScenes: (ReturnType<typeof parseSVGWithViewBox> & SVGif.Scene)[],
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

    const sceneNodeAnimations: {
      sceneId: string;
      elemSelector: string;
      keyframes: string[];
    }[] = [];
    let sceneNodeAnimationsStyle = "";

    for (const [animationIndex, animation] of animations.entries()) {
      if (animation.type === "wait") {
      } else {
        const {
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
        const getClipPathKeyframes = ({
          fromPerc,
          toPerc,
          direction,
        }: {
          fromPerc: number;
          toPerc: number;
          direction: "top to bottom" | "left to right";
        }) => {
          const clippedInset =
            direction === "top to bottom" ? `inset(0 0 100% 0)` : (
              `inset(0 100% 0 0)`
            );
          return [
            !fromPerc ? "" : `0% { opacity: 0; clip-path: ${clippedInset} }`,
            `${fromPerc}% { opacity: 0; clip-path: ${clippedInset} }`,
            `${fromPerc + 0.1}% { opacity: 1; clip-path: ${clippedInset} }`,
            `${toPerc}% { opacity: 1;  clip-path: inset(0 0 0 0);  }`,
            toPerc === 100 ? "" : (
              `100% { opacity: 1; clip-path: inset(0 0 0 0); }`
            ),
          ].filter(Boolean);
        };
        if (animation.type === "reveal-list") {
          const fromTime = currentPrevDuration;
          const toTime = fromTime + duration;
          const fromPerc = Number(getPercent(fromTime));
          const toPerc = Number(getPercent(toTime));
          sceneNodeAnimations.push({
            sceneId,
            elemSelector: elementSelector,
            keyframes: getClipPathKeyframes({
              fromPerc,
              toPerc,
              direction: "top to bottom",
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
              keyframes: getClipPathKeyframes({
                fromPerc,
                toPerc,
                direction: "left to right",
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
          ${getAnimationProperty({ elemSelector, animName: animationName, loop, totalDuration })}
        `);
      });

      const styleElem = document.createElementNS(SVG_NAMESPACE, "style");
      styleElem.textContent = sceneNodeAnimationsStyle;
      const defs = svgDom.querySelector("defs");
      if (defs) {
        defs.appendChild(styleElem);
      } else {
        const newDefs = document.createElementNS(SVG_NAMESPACE, "defs");
        newDefs.appendChild(styleElem);
        svgDom.insertBefore(newDefs, svgDom.firstChild);
      }
      const svgFileWithNewStyle = svgDom.outerHTML;
      appendSvgToSvg({ id: sceneId, svgFile: svgFileWithNewStyle }, g);
      // throw svgFileWithNewStyle;
    } else {
      appendSvgToSvg({ id: sceneId, svgFile }, g);
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

  const [x0, y0] = [width / 2, height];
  const firstTranslate = `transform: translate(${x0}px, ${y0}px)`;
  const cursorKeyframes = [`0% { opacity: 0; ${firstTranslate}; }`];
  cursorMovements.forEach(
    ({ fromPerc, toPerc, lingerPerc, target: [x, y] }, i, arr) => {
      const translate = `transform: translate(${x}px, ${y}px)`;
      const prevTarget = arr[i - 1]?.target ?? [x0, y0];
      const prevTranslate = `transform: translate(${prevTarget[0]}px, ${prevTarget[1]}px)`;
      cursorKeyframes.push(
        ...[
          `${fromPerc - 0.1}% { opacity: 0; ${prevTranslate}; }`,
          `${fromPerc}% { opacity: 1; ${prevTranslate}; }`,
          `${toPerc}% { opacity: 1; ${translate}; }`,
          `${lingerPerc ?? toPerc + 0.1}% { opacity: 0; ${translate}; }`,
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
  { svgFile, id }: { svgFile: string; id: string },
  g: SVGGElement,
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
  g.appendChild(img);

  return {
    remove: () => {
      img.remove();
    },
  };
};
