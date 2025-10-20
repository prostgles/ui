import { SVG_NAMESPACE } from "../domToSVG";
import { getAnimationProperty } from "./getSVGif";
import type { getSVGifAnimations } from "./getSVGifAnimations";

export const addSVGifTimelineControls = ({
  g,
  appendStyle,
  width,
  height,
  totalDuration,
  sceneAnimations,
}: {
  g: SVGGElement;
  appendStyle: (style: string) => void;
  width: number;
  height: number;
  totalDuration: number;
  sceneAnimations: ReturnType<typeof getSVGifAnimations>["sceneAnimations"];
}) => {
  const progressBarId = "progress-bar";
  const animationProgressBar = document.createElementNS(SVG_NAMESPACE, "rect");
  const animationProgressBarHeight = 2;
  animationProgressBar.setAttribute("id", progressBarId);
  animationProgressBar.setAttribute("x", "0");
  animationProgressBar.setAttribute("y", height - animationProgressBarHeight);
  animationProgressBar.setAttribute("height", animationProgressBarHeight);
  animationProgressBar.setAttribute("width", `${width}px`);
  animationProgressBar.setAttribute("rx", "2.5");
  animationProgressBar.setAttribute("ry", "2.5");

  const progressBarAnimationName = "animation-progress-bar";
  appendStyle(` 
    @keyframes ${progressBarAnimationName} {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(0%); }
    } 

    #${progressBarId} {
      fill: red;
      opacity: 0.3;
      ${getAnimationProperty({ totalDuration, animName: progressBarAnimationName, elemSelector: `#${progressBarId}` }, true)} 
    }

    @media (prefers-color-scheme: dark) {
      #${progressBarId} {
        opacity: 0.5;
      }
    }

    /* Pause only while SVG is pressed */
    g.paused * {
      animation-play-state: paused;
    }
  `);

  const setPause = document.createElementNS(SVG_NAMESPACE, "set");
  setPause.setAttribute("attributeName", "class");
  setPause.setAttribute("to", "paused");
  setPause.setAttribute("begin", "mousedown");
  setPause.setAttribute("end", "mouseup");

  const sceneSkipWrapper = document.createElementNS(SVG_NAMESPACE, "g");
  sceneAnimations.forEach((scene, index) => {
    const sceneSkipRect = document.createElementNS(SVG_NAMESPACE, "rect");
    const sceneStartTime = scene.startMs;
    sceneSkipRect.setAttribute(
      "x",
      `${(sceneStartTime / totalDuration) * width}`,
    );
    sceneSkipRect.setAttribute("y", "0");
    sceneSkipRect.setAttribute(
      "width",
      `${(scene.duration / totalDuration) * width}`,
    );
    sceneSkipRect.setAttribute("height", `${height}`);
    sceneSkipRect.setAttribute("fill", "none");
    sceneSkipRect.setAttribute("cursor", "pointer");

    const seekTime = sceneStartTime / 1000; // in seconds
    sceneSkipRect.addEventListener("click", () => {
      const svgElem = g.ownerSVGElement;
      if (!svgElem) return;
      const currentTime = svgElem.getCurrentTime();
      const timeDiff = seekTime - currentTime;
      svgElem.setCurrentTime(currentTime + timeDiff + 0.01); // add small offset to trigger time update
    });

    sceneSkipWrapper.appendChild(sceneSkipRect);
  });

  g.appendChild(animationProgressBar);
  // g.appendChild(sceneSkipWrapper);
  g.appendChild(setPause);
};
