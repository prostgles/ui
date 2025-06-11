import { domToSVG } from "./domToSVG";
import { getCorrespondingDarkNode } from "./getCorrespondingDarkNode";
import type { TextForSVG } from "./getTextForSVG";
import { setThemeForSVGScreenshot } from "./setThemeForSVGScreenshot";

export const domToThemeAwareSVG = async (node: HTMLElement) => {
  const { svg: svgLight } = await domToSVG(node);
  svgLight.parentElement?.removeChild(svgLight);
  await setThemeForSVGScreenshot("dark");
  const { svg: svgDark } = await domToSVG(node);
  svgDark.parentElement?.removeChild(svgDark);
  document.body.appendChild(svgDark);
  document.body.appendChild(svgLight);

  let cid = 0;
  type CSSProperty = "color" | "shadow" | "opacity" | "fontFamily" | "href";
  const getUniqueColorVarName = (
    property: CSSProperty,
    value: string,
  ): string => {
    let varName = `${property}-${cid++}`;
    while (lightToDarkMap.get(value)?.some((c) => c.varName === varName)) {
      varName = `${property}-${cid++}`;
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

  const isVisibleFillOrStroke = (color: string | null) => {
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
  lightNodes.forEach((lightNode, index) => {
    // Ignore nested svgs
    if (lightNode.ownerSVGElement !== svgLight) {
      return;
    }

    const darkNode = getCorrespondingDarkNode(darkNodes, lightNode, index);

    if (lightNode instanceof SVGUseElement) {
      const href = lightNode.getAttribute("href");
      const darkHref = darkNode?.getAttribute("href");
      if (href && darkHref) {
        const darkRefImg = svgLight.querySelector<SVGImageElement>(darkHref);
        const lightRefImg = svgDark.querySelector<SVGImageElement>(href);
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
            .querySelector("defs")
            ?.appendChild(darkImage);

          const varName = upsertCssVar("color", href, "#" + darkImage.id);
          lightNode.setAttribute("href", `var(--${varName})`);
        }
      }
      return;
    }
    if (!darkNode) {
      console.warn(
        "No corresponding dark node found for light node",
        lightNode._bboxCode,
      );
      return;
    }

    const fill = lightNode.getAttribute("fill");
    if (fill && isVisibleFillOrStroke(fill)) {
      const darkFill = darkNode.getAttribute("fill");
      const varName = upsertCssVar("color", fill, darkFill || fill);
      lightNode.setAttribute("fill", `var(--${varName})`);
    }
    const stroke = lightNode.getAttribute("stroke");
    if (stroke && isVisibleFillOrStroke(stroke)) {
      const darkStroke = darkNode.getAttribute("stroke");
      const varName = upsertCssVar("color", stroke, darkStroke || stroke);
      lightNode.setAttribute("stroke", `var(--${varName})`);
    }

    const opacity = lightNode.getAttribute("opacity");
    if (!opacity || opacity !== "1") {
      const darkOpacity = darkNode.getAttribute("opacity");
      if (darkOpacity !== opacity) {
        const varName = upsertCssVar(
          "opacity",
          opacity ?? "",
          (darkOpacity || opacity) ?? "",
        );
        lightNode.setAttribute("opacity", `var(--${varName})`);
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
    if (filter) {
      const darkFilter = darkNode.style.filter;
      if (darkFilter !== filter) {
        const varName = upsertCssVar("shadow", filter, darkFilter || filter);
        lightNode.style.filter = `var(--${varName})`;
      }
    }

    if (lightNode instanceof SVGForeignObjectElement) {
      const color = lightNode.style.color;
      if (color && isVisibleFillOrStroke(color)) {
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
        varName,
      })),
  );

  const cssSheet = document.createElement("style");
  cssSheet.setAttribute("type", "text/css");
  svgLight.appendChild(cssSheet);
  cssSheet.textContent = `:root { \n${colorArr.map(({ varName, lightColor }) => `--${varName}: ${lightColor}; `).join("\n")} \n}\n`;
  cssSheet.textContent += `@media (prefers-color-scheme: dark) { \n :root  { \n${colorArr.map(({ varName, darkColor }) => `--${varName}: ${darkColor}; `).join("\n")} \n} \n} \n`;

  const xmlSerializer = new XMLSerializer();
  const svgString = xmlSerializer.serializeToString(svgLight);
  document.body.removeChild(svgDark);
  await setThemeForSVGScreenshot(undefined);
  console.log(svgString);
  return {
    light: svgString,
    dark: xmlSerializer.serializeToString(svgDark),
  };
};

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

export type SVGScreenshotNodeType = (
  | SVGPathElement
  | SVGTextElement
  | SVGForeignObjectElement
) & {
  _bboxCode?: string;
  _purpose?: "bg" | "overflow";
  _bbox?: DOMRect;
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
