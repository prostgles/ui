/**
 * Given an SVG with multiple SVG scenes inside <g id="all-scenes">,
 * identify which g elements have the same data-selector attribute and outerHTML across scenes and
 * compress them by only keeping one instance and replacing the others with <use> elements referencing the first.
 */

import { isDefined } from "src/utils/utils";
import { SVG_NAMESPACE } from "../domToSVG";
import type { SVGifParsedScene } from "./getSVGifParsedScenes";

export const compressSVGif = (
  svg: SVGSVGElement,
  parsedScenes: SVGifParsedScene[],
) => {
  const defs = document.createElementNS(SVG_NAMESPACE, "defs");
  svg.appendChild(defs); // to ensure the SVG namespace is defined

  const allSelectorNodes = Array.from(
    svg.querySelectorAll<SVGGElement>(`[data-selector]`),
  );
  const nodesMap = new Map<string, SVGGElement>();
  allSelectorNodes.forEach((n) => {
    const { selector } = n.dataset;
    if (selector && n.outerHTML.length > 150) {
      nodesMap.set(selector, n);
    }
  });
  const nodesToReuse = new Map<string, SVGGElement>();
  const pushNodeToReuse = (selector: string, node: SVGGElement) => {
    const id = `c-${selector.replaceAll(" ", "_").replaceAll(".", "_")}`;
    if (!nodesToReuse.has(selector)) {
      nodesToReuse.set(selector, node);
      const clonedNode = node.cloneNode(true) as SVGGElement;
      clonedNode.setAttribute("id", id);
      clonedNode.removeAttribute("data-selector");
      defs.appendChild(clonedNode);
    }
    const bbox = node.getBBox();
    const useElem = document.createElementNS(SVG_NAMESPACE, "use");
    useElem.setAttribute("href", `#${id}`);
    useElem.setAttribute("width", bbox.width);
    useElem.setAttribute("height", bbox.height);
    node.replaceWith(useElem);
  };
  const scenes = Array.from(svg.querySelectorAll(`#all-scenes > svg`));

  nodesMap.forEach((originalNode, selector) => {
    const matchingScenes = scenes
      .map((scene) => {
        const [matchingNode, ...others] = scene.querySelectorAll<SVGGElement>(
          `[data-selector=${JSON.stringify(selector)}]`,
        );
        /** Do not compress nodes that are selected in animations to ensure css selectors still work */
        const parsedScene = parsedScenes.find((ps) => ps.svgDom === scene);
        if (!parsedScene) {
          throw "Could not find parsedScene";
        }
        if (
          matchingNode &&
          !others.length &&
          matchingNode.outerHTML === originalNode.outerHTML &&
          !parsedScene.animations.some((anim) => {
            const node =
              anim.type !== "wait" && anim.type !== "moveTo" ?
                matchingNode.querySelector(anim.elementSelector)
              : null;
            return node;
          })
        ) {
          return { scene, matchingNode };
        }
      })
      .filter(isDefined);

    if (matchingScenes.length > 1) {
      matchingScenes.forEach(({ matchingNode }) => {
        pushNodeToReuse(selector, matchingNode);
      });
    }
  });

  return svg;
};
