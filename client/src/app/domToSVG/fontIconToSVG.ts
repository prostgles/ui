import { includes } from "../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import type { SVGContext, SVGNodeLayout } from "./elementToSVG";
import { isElementNode } from "./isElementVisible";
import { SVG_NAMESPACE } from "./domToSVG";

export const fontIconToSVG = async (
  g: SVGGElement,
  iconInfo: NonNullable<ReturnType<typeof getFontIconElement>>,
  context: SVGContext,
  layout: SVGNodeLayout,
) => {
  // const { x, y, height, width } = layout;
  const style = getComputedStyle(iconInfo.element);
  const fontFamily = style.getPropertyValue("font-family");
  const fontSize = parseInt(style.getPropertyValue("font-size"));
  const iconColor = style.getPropertyValue("color");
  await addFontFamily(fontFamily, context).catch((err) => {
    /** Might be system font. Ignore error */
    if (fontFamily.includes(", ")) return;
    console.error(
      `Failed to add font ${fontFamily} to SVG:`,
      iconInfo.element,
      err,
    );
  });

  const rect = iconInfo.element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  /** TODO: Must calculate the actual position of :after based on main content width + bbox - :after width */
  const x =
    iconInfo.iconStyle.type === "after" ?
      layout.width + layout.x - rect.width / 2
    : layout.x;
  const y = rect.y;

  // Create a text element with the icon
  const textEl = document.createElementNS(SVG_NAMESPACE, "text");
  textEl.setAttribute("x", x + width / 2);
  textEl.setAttribute("y", y + height / 2);
  textEl.setAttribute("font-family", fontFamily);
  textEl.setAttribute("font-size", `${fontSize}px`);
  textEl.setAttribute("fill", iconColor);
  textEl.setAttribute("text-anchor", "middle");
  textEl.setAttribute("dominant-baseline", "middle");
  textEl.textContent = iconInfo.content;

  g.appendChild(textEl);
};

/**
 * TODO: extract used icons only using opentype.js
 */
const addFontFamily = async (familyName: string, context: SVGContext) => {
  if (context.fontFamilies.includes(familyName)) {
    return;
  }

  return findFontURL(familyName).then((fontURL) => {
    return fetch(fontURL)
      .then((response) => response.blob())
      .then((blob) => {
        // Convert blob to data URL
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      })
      .then((dataURL) => {
        // Create a style element for the font
        const styleEl = document.createElementNS(SVG_NAMESPACE, "style");
        styleEl.textContent = `
            @font-face {
              font-family: "${familyName}";
              src: url("${dataURL}");
              font-weight: normal;
              font-style: normal;
            }
          `;

        context.defs.appendChild(styleEl);

        context.fontFamilies.push(familyName);
      });
  });
};

export const getFontIconElement = (node: Node) => {
  if (!isElementNode(node)) return;
  const beforeStyle = getComputedStyle(node as HTMLElement, ":before");
  const afterStyle = getComputedStyle(node as HTMLElement, ":after");
  const iconStyle =
    beforeStyle.content && !includes(beforeStyle.content, ["", "none"]) ?
      ({ type: "before", style: beforeStyle } as const)
    : afterStyle.content && !includes(afterStyle.content, ["", "none"]) ?
      ({ type: "after", style: afterStyle } as const)
    : "";
  if (!iconStyle) {
    return;
  }
  return {
    element: node,
    iconStyle,
    content: iconStyle.style.content.replace(/['"]/g, ""),
  };
};

async function findFontURL(fontFamily: string): Promise<string> {
  // This is a simplified approach to find the font URL

  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules;

      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule instanceof CSSFontFaceRule) {
          const fontFamilyValue = rule.style
            .getPropertyValue("font-family")
            .replace(/['"]/g, "");

          if (fontFamilyValue === fontFamily) {
            // Extract the URL from the src property
            const src = rule.style.getPropertyValue("src");
            const urlMatch = src.match(/url\(['"]?([^'"]+)['"]?\)/);

            if (urlMatch && urlMatch[1]) {
              return urlMatch[1];
            }
          }
        }
      }
    } catch (e) {
      // Security error, likely due to cross-origin stylesheet
      console.warn("Could not access stylesheet:", e);
    }
  }

  throw new Error(`Could not find URL for font family: ${fontFamily}`);
}
