import { tout } from "src/utils";
import { SVG_NAMESPACE } from "../domToSVG";
import { renderSvg } from "../text/textToSVG";

type Scene = {
  svgFileName: string;
  animations: SVGifAnimation[];
};

type SVGifAnimation =
  | {
      elementSelector: string;
      duration: number;
      type: "click" | "zoomTo";
    }
  | {
      type: "wait";
      duration: number;
    };

export const getSVGif = async (
  scenes: Scene[],
  svgFiles: Map<string, string>,
  loop = true,
) => {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("xmlns", SVG_NAMESPACE);
  const firstScene = scenes[0];
  if (!firstScene) {
    throw "No scenes provided";
  }

  const pointerId = "pointer";
  const pointerCircle = document.createElementNS(SVG_NAMESPACE, "circle");

  pointerCircle.setAttribute("r", "10");
  pointerCircle.setAttribute("opacity", "0");
  pointerCircle.setAttribute("id", pointerId);
  const currPos = { x: 0, y: 0, show: false };
  const cursorAnimations: {
    from: [number, number];
    to: [number, number];
    duration: number;
    delay: number;
    show: boolean;
  }[] = [];

  const style = document.createElementNS(SVG_NAMESPACE, "style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    } 
    @keyframes show {
      0% { opacity: 0; }
      1% { opacity: 1; }
      99% { opacity: 1; }
      100% { opacity: 0; }
    }

    #${pointerId} { 
      transform-origin: center;
      fill: #00000036;
      filter: drop-shadow(0 0 2px #000000aa);
    }
  `;

  let viewBox: string | null | undefined;
  let currentPrevDuration = 0;
  let width = 0;
  let height = 0;
  for (const [sceneIndex, { svgFileName, animations }] of scenes.entries()) {
    const svgFile = svgFiles.get(svgFileName);
    if (!svgFile) {
      throw `SVG file not found: ${svgFileName}`;
    }

    const parsedSVG = new DOMParser().parseFromString(svgFile, "image/svg+xml");
    const currentViewBox = parsedSVG.documentElement.getAttribute("viewBox");
    if (!currentViewBox) {
      throw `SVG file ${svgFileName} does not have a viewBox attribute`;
    }
    if (!viewBox) {
      viewBox = currentViewBox;
      width = Number(viewBox.split(" ")[2]);
      height = Number(viewBox.split(" ")[3]);
      if (!width || !height) {
        throw `Invalid viewBox dimensions in SVG file ${svgFileName}`;
      }
      currPos.x = width;
      currPos.y = height / 2;
    }

    const img = document.createElementNS(SVG_NAMESPACE, "image");
    img.setAttribute("xmlns", SVG_NAMESPACE);
    img.setAttribute(
      "href",
      `data:image/svg+xml;utf8,${encodeURIComponent(svgFile)}`,
    );
    img.setAttribute("width", "100%");
    img.setAttribute("height", "100%");
    img.setAttribute("style", "opacity: 0; z-index: 123210;");
    svg.appendChild(img);

    const svgDom = parsedSVG.documentElement as unknown as SVGElement;
    const { remove } = renderSvg(svgDom);

    const sceneDuration = animations.reduce(
      (acc, anim) => acc + anim.duration,
      0,
    );
    const sceneId = `scene-${sceneIndex}`;
    img.setAttribute("id", sceneId);
    const isLastScene = sceneIndex === scenes.length - 1;
    // img.setAttribute("style", `opacity: ${isLastScene ? 1 : 0};`);

    const sceneAnimations = [
      `show ${sceneDuration}ms ease-in-out ${currentPrevDuration}ms  ${loop ? "infinite" : "forwards"}`,
    ];
    for (const anim of animations) {
      if (anim.type === "wait") {
      } else if (anim.type === "click") {
        const element = svgDom.querySelector<SVGGElement>(anim.elementSelector);
        if (!element) {
          throw `Element not found: ${anim.elementSelector} in SVG file ${svgFileName}`;
        }

        const bbox = element.getBBox();
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        const pointerTranslateX = cx;
        const pointerTranslateY = cy;
        cursorAnimations.push({
          from: [currPos.x, currPos.y],
          to: [pointerTranslateX, pointerTranslateY],
          duration: 800,
          delay: currentPrevDuration,
          show: true,
        });
      }
      currentPrevDuration += anim.duration;
    }

    if (isLastScene) {
      sceneAnimations.push(
        ` fadeIn 50ms ease-in-out ${currentPrevDuration}ms  ${loop ? "infinite" : "forwards"}`,
      );
    }

    style.textContent += `
      #${sceneId} {
        animation: ${sceneAnimations.join(", \n")};
      }
    `;

    remove();
  }

  cursorAnimations.forEach(({ from, to, delay, duration }, index) => {
    const animId = `cursor-move-${index}`;
    style.textContent += `
      @keyframes ${animId} {
        from { transform: translate(${from[0]}px, ${from[1]}px); }
        to { transform: translate(${to[0]}px, ${to[1]}px); }
      } 
      #${pointerId} {
        animation: 
          ${animId} ${duration}ms ease-in-out ${delay}ms forwards,
                show ${duration + 800}ms ease-in-out ${delay}ms forwards;
      }
    `;
  });

  if (!viewBox) {
    throw "No viewBox found";
  }

  svg.setAttribute("viewBox", viewBox);
  svg.appendChild(pointerCircle);

  document.body.appendChild(svg);

  svg.appendChild(style);
  const xmlSerializer = new XMLSerializer();
  const svgString = xmlSerializer.serializeToString(svg);
  return svgString;
};
