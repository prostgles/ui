import { domToSVG } from "./domToSVG";
import { getCorrespondingDarkNode } from "./getCorrespondingDarkNode";
import type { TextForSVG } from "./text/getTextForSVG";
import { setThemeForSVGScreenshot } from "./setThemeForSVGScreenshot";
import { renderSvg } from "./text/textToSVG";
import type { getWhatToRenderOnSVG } from "./utils/getWhatToRenderOnSVG";
import { isDefined } from "src/utils";
import { matchChildren } from "./utils/matchChildren";
export const displayNoneIfDark = "--dark-theme-hide";
export const displayNoneIfLight = "--light-theme-hide";
export const domToThemeAwareSVG = async (
  node: HTMLElement,
  debugMode?: "light" | "both",
) => {
  const { svg: svgLight } = await domToSVG(node);
  if (debugMode === "light") {
    renderSvg(svgLight);
    return;
  }
  svgLight.parentElement?.removeChild(svgLight);
  await setThemeForSVGScreenshot("dark");
  const { svg: svgDark } = await domToSVG(node);
  svgDark.parentElement?.removeChild(svgDark);
  document.body.appendChild(svgDark);
  document.body.appendChild(svgLight);

  let varId = 0;
  type CSSProperty = "color" | "shadow" | "opacity" | "fontFamily" | "href";
  const getUniqueColorVarName = (
    property: CSSProperty,
    value: string,
  ): string => {
    let varName = `${property}-${varId++}`;
    while (lightToDarkMap.get(value)?.some((c) => c.varName === varName)) {
      varName = `${property}-${varId++}`;
    }
    return varName;
  };
  const lightToDarkMap = new Map<
    string,
    { darkValue: string; varName: string }[]
  >();
  const upsertCssVar = (
    property: CSSProperty,
    value: string,
    darkValue: string,
  ): string => {
    const existingGroup = lightToDarkMap.get(value) ?? [];

    const existing = existingGroup.find((c) => c.darkValue === darkValue);
    if (existing) {
      return existing.varName;
    }
    const varName = getUniqueColorVarName(property, value);
    lightToDarkMap.set(value, [
      ...existingGroup,
      { darkValue: darkValue, varName },
    ]);
    return varName;
  };

  const isVisibleColor = (color: string | null) => {
    const isVisible =
      color &&
      color !== "none" &&
      color !== "currentColor" &&
      color !== "rgba(0, 0, 0, 0)" &&
      color !== "transparent";

    return isVisible;
  };

  const selector = "line, path, text, foreignObject, g, use";
  const lightNodes = svgLight.querySelectorAll<SVGScreenshotNodeType>(selector);
  const darkNodes = svgDark.querySelectorAll<SVGScreenshotNodeType>(selector);

  if (!svgDark.isConnected || !svgLight.isConnected) {
    throw new Error(
      "SVGs must be connected to the DOM to ensure bbox calculations work.",
    );
  }

  const matchesMap: Map<
    SVGScreenshotNodeType,
    SVGScreenshotNodeType | undefined
  > = new Map();
  const matches = Array.from(lightNodes)
    .map((lightNode, index) => {
      // Ignore nested svgs
      if (lightNode.ownerSVGElement !== svgLight) {
        return;
      }
      const darkNode = getCorrespondingDarkNode(darkNodes, lightNode, index);
      matchesMap.set(lightNode, darkNode);
      return { lightNode, darkNode };
    })
    .filter(isDefined);

  matches.forEach(({ lightNode, darkNode }) => {
    if (!darkNode) {
      console.warn(
        "No corresponding dark node found for light node " + lightNode.nodeName,
        lightNode._bboxCode,
      );
      // if (
      //   lightNode instanceof SVGTextElement
      //   // &&
      //   // lightNode.textContent?.includes("11:4")
      // ) {
      //   console.log(lightNodes, darkNodes);
      //   debugger;
      // }
      return;
    }
    if (lightNode instanceof SVGUseElement) {
      const lightHref = lightNode.getAttribute("href");
      const darkHref = darkNode.getAttribute("href");
      if (lightHref && darkHref) {
        const darkRefImg = svgDark.querySelector<SVGImageElement>(darkHref);
        const lightRefImg = svgLight.querySelector<SVGImageElement>(lightHref);
        const darkRefImgData = darkRefImg?.href.baseVal;
        const lightRefImgData = lightRefImg?.href.baseVal;
        if (
          darkRefImgData &&
          lightRefImgData &&
          darkRefImgData !== lightRefImgData
        ) {
          /** Add dark image into light svg */
          const darkImage = darkRefImg.cloneNode(true) as SVGImageElement;
          darkImage.id = `${darkImage.id}-dark`;
          lightNode.ownerSVGElement
            ?.querySelector("defs")
            ?.appendChild(darkImage);

          const darkThemeUse = lightNode.cloneNode(true) as SVGUseElement;
          darkThemeUse.setAttribute("href", `#${darkImage.id}`);
          darkThemeUse.style.visibility = `var(${displayNoneIfDark})`;
          lightNode.parentElement?.appendChild(darkThemeUse);
          lightNode.style.display = `var(${displayNoneIfLight})`;
        }
      }
      return;
    }

    /** Add extra elements from dark node (sometimes the background changes from transparent to color) */
    if (lightNode instanceof SVGGElement && darkNode instanceof SVGGElement) {
      matchChildren(lightNode, darkNode, matchesMap);
    }

    const fill = lightNode.getAttribute("fill");
    const darkFill = darkNode.getAttribute("fill");
    if (fill !== darkFill) {
      const varName = upsertCssVar("color", fill || "", darkFill || fill || "");
      lightNode.setAttribute("fill", `var(--${varName})`);
    }
    const stroke = lightNode.getAttribute("stroke");
    const darkStroke = darkNode.getAttribute("stroke");
    if (stroke !== darkStroke) {
      const varName = upsertCssVar(
        "color",
        stroke || "",
        darkStroke || stroke || "",
      );
      lightNode.setAttribute("stroke", `var(--${varName})`);
    }
    const color = lightNode.style.color;
    if (color) {
      const darkColor = darkNode.style.color;
      const varName = upsertCssVar("color", color, darkColor || color);
      lightNode.style.color = `var(--${varName})`;
    }

    const opacity = lightNode.style.opacity;
    if (!opacity || opacity !== "1") {
      const darkOpacity = darkNode.style.opacity;
      if (darkOpacity !== opacity) {
        const varName = upsertCssVar(
          "opacity",
          opacity,
          darkOpacity || opacity,
        );
        lightNode.style.opacity = `var(--${varName})`;
      }
    }

    /** Just to save space */
    if (lightNode instanceof SVGTextElement) {
      const fontFamily = lightNode.getAttribute("font-family");
      if (fontFamily && fontFamily.length > 12) {
        const darkFontFamily = darkNode.getAttribute("font-family");
        const varName = upsertCssVar(
          "fontFamily",
          fontFamily,
          darkFontFamily || fontFamily,
        );
        lightNode.setAttribute("font-family", `var(--${varName})`);
      }
    }

    const filter = lightNode.style.filter;
    const darkFilter = darkNode.style.filter;
    if (darkFilter !== filter) {
      const varName = upsertCssVar("shadow", filter, darkFilter || filter);
      lightNode.style.filter = `var(--${varName})`;
    }

    if (lightNode instanceof SVGForeignObjectElement) {
      const color = lightNode.style.color;
      if (color && isVisibleColor(color)) {
        const darkColor = darkNode.style.color;
        const varName = upsertCssVar("color", color, darkColor || color);
        lightNode.style.color = `var(--${varName})`;
      }
    }
  });
  const colorArr = Array.from(lightToDarkMap.entries()).flatMap(
    ([lightColor, darkItems]) =>
      darkItems.map(({ darkValue: darkColor, varName }) => ({
        lightColor,
        darkColor,
        sameForBoth: lightColor === darkColor,
        varName,
      })),
  );

  const cssSheet = document.createElement("style");
  cssSheet.setAttribute("type", "text/css");
  svgLight.appendChild(cssSheet);
  cssSheet.textContent = [
    `:root { `,
    `  ${displayNoneIfDark}: visible;`,
    `  ${displayNoneIfLight}: hidden;`,
    ...colorArr.map(
      ({ varName, lightColor }) => `  --${varName}: ${lightColor}; `,
    ),
    `}\n`,
  ].join("\n");
  cssSheet.textContent += [
    `@media (prefers-color-scheme: dark) { `,
    ` :root  { `,
    `  ${displayNoneIfDark}: hidden;`,
    `  ${displayNoneIfLight}: visible;`,
    ...colorArr
      .filter((c) => !c.sameForBoth)
      .map(({ varName, darkColor }) => `  --${varName}: ${darkColor}; `),
    `  }`,
    `} \n`,
  ].join("\n");

  const xmlSerializer = new XMLSerializer();
  const svgString = xmlSerializer.serializeToString(svgLight);
  document.body.removeChild(svgDark);
  await setThemeForSVGScreenshot(undefined);
  document.body.removeChild(svgLight);

  if (debugMode === "both") {
    renderSvg(svgLight);
    return;
  }
  return {
    light: svgString,
    dark: xmlSerializer.serializeToString(svgDark),
  };
};

document.body.addEventListener("keydown", (e) => {
  if (e.key === "F2") {
    domToThemeAwareSVG(document.body, "light");
  } else if (e.key === "F4") {
    domToThemeAwareSVG(document.body, "both");
  } else if (e.key === "F6") {
    // eslint-disable-next-line no-debugger
    debugger;
  }
});

/** Interleave data */
export const getBBoxCode = (
  element: HTMLElement,
  {
    x,
    y,
    width,
    height,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
) => {
  return `${x}-${y}-${width}-${height}__${element.nodeName}${getElementPath(element).join("-")}`;
};

declare global {
  interface SVGGElement {
    _gWrapperFor?: HTMLElement;
    _domElement?: HTMLElement;
    _whatToRender?: Awaited<ReturnType<typeof getWhatToRenderOnSVG>>;
  }
}
export type SVGScreenshotNodeType = (
  | SVGPathElement
  | SVGTextElement
  | SVGForeignObjectElement
) & {
  _bboxCode?: string;
  _purpose?: "bg" | "overflow" | "wrapper";
  _bbox?: DOMRect;
  _gWrapperFor?: HTMLElement;
  _domElement?: HTMLElement;
  _domElementId?: string;
  _domElementPath?: number[];
  _domElementPathString?: string;
  _textInfo?: TextForSVG;
};

const getElementPath = (element: HTMLElement) => {
  const path: number[] = [];
  let current: HTMLElement | ParentNode | null = element;

  while (current && current !== document.body) {
    const index = Array.from(current.parentNode?.children ?? []).indexOf(
      // @ts-ignore
      current,
    );
    path.unshift(index);
    current = current.parentNode;
  }

  return path;
};
