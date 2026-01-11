import { SVG_NAMESPACE } from "../domToSVG";
import { getAnimationProperty } from "./getSVGif";

export const addSVGifPointer = ({
  g,
  appendStyle,
  cursorKeyframes,
  totalDuration,
  isDarkTheme,
}: {
  g: SVGGElement;
  appendStyle: (style: string) => void;
  totalDuration: number;
  cursorKeyframes: string[];
  isDarkTheme: boolean;
}) => {
  const pointerId = "pointer";
  const pointerCircle = document.createElementNS(SVG_NAMESPACE, "circle");
  pointerCircle.setAttribute("r", "10");
  pointerCircle.setAttribute("opacity", "0");
  pointerCircle.setAttribute("id", pointerId);

  const darkThemeStyle = `
    #${pointerId} {
      fill: #eaeaea99;
      filter: drop-shadow(0 0 2px #ffffffaa);
    }
  `;

  /** Ensure dark-theme mode appears as expected on light theme mode */
  const lightThemeStyle = `
    #${pointerId} { 
      transform-origin: center;
      fill: #00000036;
      filter: drop-shadow(0 0 2px #000000aa);
    }
  
    ${isDarkTheme ? darkThemeStyle : ""}
  `;
  const cursorAnimationName = `cursor-move`;
  appendStyle(`
    ${lightThemeStyle}

    @media (prefers-color-scheme: dark) {
      ${darkThemeStyle}
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
