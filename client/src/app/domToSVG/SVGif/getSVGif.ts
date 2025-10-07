import { fixIndent } from "@common/utils";
import { SVG_NAMESPACE } from "../domToSVG";
import { getSVGifAnimations } from "./getSVGifAnimations";

export type SVGifScene = {
  svgFileName: string;
  animations: SVGifAnimation[];
};

export type SVGifAnimation =
  | {
      elementSelector: string;
      duration: number;
      type: "click" | "zoomTo";

      /**
       * Time to wait before clicking after reaching the final position
       * */
      waitBeforeClick?: number;
      /**
       * Time to stay on the final position after clicking
       */
      lingerMs?: number;
    }
  | {
      type: "wait";
      duration: number;
    };

export const getSVGif = (
  scenes: SVGifScene[],
  svgFiles: Map<string, string>,
  loop = true,
) => {
  const parsedScenes = scenes.map((scene) => ({
    ...scene,
    ...parseSVGWithViewBox(scene.svgFileName, svgFiles),
  }));
  const firstScene = parsedScenes[0];
  if (!firstScene) {
    throw "No scenes provided";
  }

  const pointerId = "pointer";
  const pointerCircle = document.createElementNS(SVG_NAMESPACE, "circle");
  pointerCircle.setAttribute("r", "10");
  pointerCircle.setAttribute("opacity", "0");
  pointerCircle.setAttribute("id", pointerId);

  const { viewBox, width, height } = firstScene;
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("xmlns", SVG_NAMESPACE);
  svg.setAttribute("viewBox", viewBox);
  const style = document.createElementNS(SVG_NAMESPACE, "style");
  svg.appendChild(style);
  const g = document.createElementNS(SVG_NAMESPACE, "g");
  g.setAttribute("id", "all-scenes");
  svg.appendChild(g);

  const { cursorKeyframes, sceneAnimations, totalDuration } =
    getSVGifAnimations({ width, height }, g, parsedScenes);

  const cursorAnimationName = `cursor-move`;
  const getAnimationProperty = (
    {
      elemId,
      animName,
    }: {
      elemId: string;
      animName: string;
    },
    onlyValue = false,
  ) => {
    const value = `animation: ${animName} ${totalDuration}ms ease-in-out ${
      loop ? "infinite" : "forwards"
    };`;
    if (onlyValue) return value;
    return fixIndent(`
      #${elemId} {
        ${value}
      }
    `);
  };
  style.textContent += "\n";
  sceneAnimations.forEach(({ sceneId, keyframes }) => {
    const animationName = `scene-${sceneId}-anim`;
    style.textContent += "\n";
    style.textContent += fixIndent(`
      @keyframes ${animationName} {
        ${keyframes.join("\n")}
      }
      ${getAnimationProperty({ elemId: sceneId, animName: animationName })}
    `);
  });
  style.textContent += "\n\n";
  style.textContent += fixIndent(`
    @keyframes ${cursorAnimationName} {
      ${cursorKeyframes.join("\n")}
    } 
    ${getAnimationProperty({ elemId: pointerId, animName: cursorAnimationName })}
  `);

  const progressBarId = "animation-progress-bar";
  const animationProgressBar = document.createElementNS(SVG_NAMESPACE, "rect");
  const animationProgressBarHeight = 2;
  animationProgressBar.setAttribute("id", progressBarId);
  animationProgressBar.setAttribute("x", "0");
  animationProgressBar.setAttribute("y", height - animationProgressBarHeight);
  animationProgressBar.setAttribute("height", animationProgressBarHeight);
  animationProgressBar.setAttribute("width", `${width}px`);
  animationProgressBar.setAttribute("rx", "2.5");
  animationProgressBar.setAttribute("ry", "2.5");

  const progressBarAnimationName = "progress-bar";
  style.textContent += ` 
    @keyframes ${progressBarAnimationName} {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(0%); }
    } 

    #${progressBarId} {
      fill: red;
      opacity: 0.3;
      ${getAnimationProperty({ animName: progressBarAnimationName, elemId: progressBarId }, true)} 
    }

    #${pointerId} { 
      transform-origin: center;
      fill: #00000036;
      filter: drop-shadow(0 0 2px #000000aa);
    }

    @media (prefers-color-scheme: dark) {
      
      #${progressBarId} {
        opacity: 0.5;
      }

      #${pointerId} {
        fill: #ffffff36;
        filter: drop-shadow(0 0 2px #ffffffaa);
      }
    }

    /* Pause only while SVG is pressed */
    g.paused * {
      animation-play-state: paused;
    }
  `;

  const setPause = document.createElementNS(SVG_NAMESPACE, "set");
  setPause.setAttribute("attributeName", "class");
  setPause.setAttribute("to", "paused");
  setPause.setAttribute("begin", "mousedown");
  setPause.setAttribute("end", "mouseup");

  g.appendChild(pointerCircle);
  g.appendChild(animationProgressBar);
  g.appendChild(setPause);
  // document.body.appendChild(svg); // debugging
  const xmlSerializer = new XMLSerializer();
  const svgString = xmlSerializer.serializeToString(svg);
  return svgString;
};

export const parseSVGWithViewBox = (
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
