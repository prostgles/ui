import type { SVGScreenshotNodeType } from "./domToThemeAwareSVG";

export const getCorrespondingDarkNode = (
  darkNodes: NodeListOf<SVGScreenshotNodeType>,
  lightNode: SVGScreenshotNodeType,
  index: number,
): SVGScreenshotNodeType | undefined => {
  let darkNode = darkNodes[index];

  const darkNodesArr = Array.from(darkNodes);
  const matchesTypes = darkNodesArr.filter(
    (n) => n.nodeName === lightNode.nodeName,
  );
  darkNode = matchesTypes.find(
    (n) => lightNode._bboxCode && n._bboxCode === lightNode._bboxCode,
  );

  if (darkNode) return darkNode;

  const lightBBox = lightNode.getBBox();
  let matchedTypeAndOverlap = matchesTypes.filter((n) => {
    if (lightNode._gWrapperFor) {
      return n._gWrapperFor === lightNode._gWrapperFor;
    }
    const nBBox = n.getBBox();

    if (!lightBBox.width || !lightBBox.height) {
      return (
        lightBBox.width === nBBox.width &&
        lightBBox.height === nBBox.height &&
        lightBBox.x === nBBox.x &&
        lightBBox.y === nBBox.y
      );
    }

    const bboxesOverlap =
      lightBBox.x < nBBox.x + nBBox.width &&
      lightBBox.x + lightBBox.width > nBBox.x &&
      lightBBox.y < nBBox.y + nBBox.height &&
      lightBBox.y + lightBBox.height > nBBox.y;
    return bboxesOverlap;
  });
  if (matchedTypeAndOverlap.length > 1) {
    matchedTypeAndOverlap = matchedTypeAndOverlap.filter((n) =>
      n.nodeName === "use" ?
        n.getAttribute("href") === lightNode.getAttribute("href")
      : n.nodeName === "path" ?
        n.getAttribute("d") === lightNode.getAttribute("d")
      : n.nodeName === "line" ?
        n.getAttribute("x1") === lightNode.getAttribute("x1") &&
        n.getAttribute("y1") === lightNode.getAttribute("y1") &&
        n.getAttribute("x2") === lightNode.getAttribute("x2") &&
        n.getAttribute("y2") === lightNode.getAttribute("y2")
      : n.textContent === lightNode.textContent ||
        /** Some text content changes between renders */
        (n.getAttribute("x") === lightNode.getAttribute("x") &&
          n.getAttribute("y") === lightNode.getAttribute("y")),
    );
  }
  // if (
  //   lightNode instanceof SVGTextElement &&
  //   lightNode.textContent?.includes("11:5")
  //   // &&
  //   // lightNode.getAttribute("fill") === "rgb(108, 6, 171)"
  // ) {
  //   debugger;
  // }
  if (matchedTypeAndOverlap.length > 1 && lightNode.nodeName === "path") {
    matchedTypeAndOverlap = matchedTypeAndOverlap.filter(
      (n) => n._bboxCode?.length === lightNode._bboxCode?.length,
    );
  }
  if (lightNode._gWrapperFor && matchedTypeAndOverlap.length > 1) {
    throw new Error("Multiple matching gWrappers found");
  }
  if (matchedTypeAndOverlap.length === 1) {
    darkNode = matchedTypeAndOverlap[0];
  }
  return darkNode;
};
