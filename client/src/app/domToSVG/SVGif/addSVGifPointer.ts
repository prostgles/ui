import { SVG_NAMESPACE } from "../domToSVG";
import { getAnimationProperty } from "./getSVGif";

export const addSVGifPointer = ({
  g,
  appendStyle,
  cursorKeyframes,
  totalDuration,
}: {
  g: SVGGElement;
  appendStyle: (style: string) => void;
  totalDuration: number;
  cursorKeyframes: string[];
}) => {
  const pointerId = "pointer";
  const pointerCircle = document.createElementNS(SVG_NAMESPACE, "circle");
  pointerCircle.setAttribute("r", "10");
  pointerCircle.setAttribute("opacity", "0");
  pointerCircle.setAttribute("id", pointerId);

  const cursorAnimationName = `cursor-move`;
  appendStyle(`
    #${pointerId} { 
      transform-origin: center;
      fill: #00000036;
      filter: drop-shadow(0 0 2px #000000aa);
    }

    @media (prefers-color-scheme: dark) {
      #${pointerId} {
        fill: #ffffff36;
        filter: drop-shadow(0 0 2px #ffffffaa);
      }
    }

    @keyframes ${cursorAnimationName} {
    ${cursorKeyframes.map((v) => `  ${v}`).join("\n")}
    } 
    ${getAnimationProperty({
      totalDuration,
      elemSelector: `#${pointerId}`,
      animName: cursorAnimationName,
      easeFunction: "ease-out",
    })}
  `);
  g.appendChild(pointerCircle);
};
