import type { SVGif } from "src/Testing";
import type { SVGifParsedScene } from "../getSVGifParsedScenes";
import { getSVGifRevealKeyframes } from "../getSVGifRevealKeyframes";
import { toFixed } from "../../utils/toFixed";
import type { SceneNodeAnimation } from "../getSVGifAnimations";
import { fixIndent } from "@common/utils";

export const getSVGifCursorAnimationHandler = ({
  parsedScenes,
  getPercent,
  totalSvgifDuration,
  width,
  height,
}: {
  parsedScenes: SVGifParsedScene[];
  getPercent: (ms: number, offset?: 0 | 0.1 | -0.1) => number;
  totalSvgifDuration: number;
  width: number;
  height: number;
}) => {
  const cursorMovements: {
    fromPerc: number;
    toPerc: number;
    lingerPerc: number | undefined;
    target: [number, number];
  }[] = [];
  const [x0, y0] = [width / 2, height];

  const addAnimation = ({
    currentPrevDuration,
    animationIndex,
    animations,
    sceneIndex,
    animation,
    bbox,
    svgFileName,
    sceneNodeAnimations,
    sceneId,
  }: {
    currentPrevDuration: number;
    animations: SVGif.Animation[];
    animationIndex: number;
    sceneIndex: number;
    animation: SVGif.CursorAnimation;
    bbox: DOMRect | undefined;
    svgFileName: string;
    sceneNodeAnimations: SceneNodeAnimation[];
    sceneId: string;
  }) => {
    if (animation.type === "moveTo") {
      cursorMovements.push({
        fromPerc: Number(getPercent(currentPrevDuration)),
        toPerc: Number(getPercent(currentPrevDuration + animation.duration)),
        lingerPerc: undefined,
        target: animation.xy,
      });
      return;
    }

    if (!bbox) {
      throw new Error(`Unexpected. BBox missing`);
    }

    const {
      type,
      lingerMs = 500,
      waitBeforeClick = 500,
      duration,
      elementSelector,
      offset,
    } = animation;

    const xOffset = offset?.x ?? Math.min(60, bbox.width / 2);
    const yOffset = offset?.y ?? Math.min(30, bbox.height / 2);
    const cx = bbox.x + xOffset;
    const cy = bbox.y + yOffset;

    if (duration < waitBeforeClick) {
      throw new Error(
        fixIndent(`
          Duration ${duration}ms for "${type}" animation on element ${elementSelector} in SVG file ${svgFileName} is too short. 
          It must be greater than the waitBeforeClick time of ${waitBeforeClick}ms.
        `),
      );
    }
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
            getPercent(Math.min(totalSvgifDuration, clickEndTime + lingerMs)),
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
        currentPrevDuration,
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
  };

  const getCursorKeyframes = () => {
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
            `${toFixed(lingerPerc ?? toPerc)}% { opacity: 1; ${translate}; }`,
            `${toFixed(lingerPerc ?? toPerc + 0.1)}% { opacity: 0; ${translate}; }`,
          ],
        );
      },
    );

    return { cursorKeyframes };
  };

  return { addAnimation, cursorMovements, getCursorKeyframes };
};
