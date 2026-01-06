import { isDefined } from "src/utils/utils";
import {
  displayNoneIfLight,
  type SVGScreenshotNodeType,
} from "../domToThemeAwareSVG";

export const addNewChildren = (
  lightNode: SVGScreenshotNodeType,
  darkNode: SVGScreenshotNodeType,
  matchesMap: Map<SVGScreenshotNodeType, SVGScreenshotNodeType | undefined>,
) => {
  const matchingChildren = Array.from(lightNode.children)
    .map((lightChild, index) => {
      const darkChild = matchesMap.get(lightChild as SVGScreenshotNodeType);
      if (darkChild) {
        return {
          lightChild: lightChild as SVGScreenshotNodeType,
          darkChild,
          index,
        };
      }
    })
    .filter(isDefined);

  const newChildren = Array.from(darkNode.children)
    .map((darkChild, index) => {
      if (
        !(
          darkChild instanceof SVGGElement ||
          darkChild instanceof SVGPathElement ||
          darkChild instanceof SVGRectElement ||
          darkChild instanceof SVGCircleElement ||
          darkChild instanceof SVGUseElement
        )
      )
        return;
      const isMatched = matchingChildren.find(
        (mc) => mc.darkChild === darkChild,
      );
      if (!isMatched) {
        return {
          darkChild: darkChild as SVGScreenshotNodeType,
          index,
        };
      }
    })
    .filter(isDefined);

  /** Add new nodes to lightNode */
  newChildren.forEach(({ darkChild, index }) => {
    const clonedChild = darkChild.cloneNode(true) as SVGScreenshotNodeType;
    clonedChild.style.opacity = `var(${displayNoneIfLight})`;
    lightNode.insertBefore(clonedChild, lightNode.children[index] || null);
  });
};
