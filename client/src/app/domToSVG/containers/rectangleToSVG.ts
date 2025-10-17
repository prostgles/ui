import { addSpecificBorders, roundedRectPath } from "./bgAndBorderToSVG";
import { SVG_NAMESPACE } from "../domToSVG";
import type { SVGScreenshotNodeType } from "../domToThemeAwareSVG";
import type { SVGContext, SVGNodeLayout } from "./elementToSVG";
import type { getWhatToRenderOnSVG } from "../utils/getWhatToRenderOnSVG";
import { getBoxShadowAsDropShadow } from "./shadowToSVG";
import { isEmpty } from "src/utils";

export const rectangleToSVG = (
  g: SVGGElement,
  element: HTMLElement,
  style: CSSStyleDeclaration,
  { x, y, width, height }: Pick<SVGNodeLayout, "x" | "y" | "width" | "height">,
  {
    border,
    background,
    backdropFilter,
    attributeData,
  }: Pick<
    Awaited<ReturnType<typeof getWhatToRenderOnSVG>>,
    "background" | "border" | "backdropFilter" | "attributeData"
  >,
  bboxCode: string,
  context: SVGContext,
) => {
  const shadow = getBoxShadowAsDropShadow(style);
  const scrollMask =
    style.backdropFilter &&
    style.mask &&
    style.mask.includes("linear-gradient");
  if (
    !border &&
    !background &&
    !shadow &&
    !scrollMask &&
    !backdropFilter &&
    (!attributeData || isEmpty(attributeData))
  ) {
    return;
  }

  const { path, showBorder, rtl, rtr, rbr, rbl, borderWidth } =
    getRectanglePath(style, { x, y, width, height }, { border });
  path._domElement = element;

  path._bboxCode = bboxCode;
  path._purpose = "bg";

  /** This is required to make backgroundSameAsRenderedParent work as expected */
  path.setAttribute("fill", "transparent");

  g.appendChild(path);

  const maskLinearGradients = style.maskImage.split("linear-gradient(");
  const blendModes = style.maskComposite.split(", ");
  if (
    maskLinearGradients.length > 1 &&
    blendModes.every((b) => b === "source-in")
  ) {
    const combinedMask = document.createElementNS(
      SVG_NAMESPACE,
      "mask",
    ) as SVGMaskElement;
    combinedMask.setAttribute("id", `mask-${context.idCounter++}`);
    combinedMask.setAttribute("maskUnits", "userSpaceOnUse");
    combinedMask.setAttribute("maskContentUnits", "userSpaceOnUse");
    context.defs.appendChild(combinedMask);
    g.setAttribute("mask", `url(#${combinedMask.id})`);

    const masks = maskLinearGradients.slice(1);

    masks.forEach((grad, index) => {
      const direction =
        grad.startsWith("to top") ? "toTop"
        : grad.startsWith("to left") ? "toLeft"
        : undefined;
      if (index) {
        // Mask combining does not work
        return;
      }

      const stops = grad.split("rgb").slice(1);
      const stopsWithColors = stops.map((stop) => {
        const color = "rgb" + stop.split(")")[0] + ")";
        const offset =
          stop.split(")")[1]?.trim().replace(",", "").replace(")", "") || "0%";
        let percentageOffset = offset;
        if (offset.includes("px")) {
          const pxValue = parseFloat(offset);
          const percentage =
            (pxValue / (direction === "toLeft" ? width : height)) * 100;
          percentageOffset = `${percentage}%`;
        }
        return {
          color,
          offset: percentageOffset,
          opacity: parseFloat(stop.split(")")[0]?.split(",")[3] || "1"),
        };
      });

      const gradient = document.createElementNS(
        SVG_NAMESPACE,
        "linearGradient",
      ) as SVGLinearGradientElement;
      gradient.setAttribute(
        "id",
        `mask-gradient-${direction}-${context.idCounter++}`,
      );
      if (direction === "toTop") {
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "100%");
        gradient.setAttribute("x2", "0%");
        gradient.setAttribute("y2", "0%");
      } else {
        gradient.setAttribute("x1", "100%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("x2", "0%");
        gradient.setAttribute("y2", "0%");
      }
      stopsWithColors.forEach(({ opacity, offset }) => {
        const stop = document.createElementNS(
          SVG_NAMESPACE,
          "stop",
        ) as SVGStopElement;
        stop.setAttribute(
          "offset",
          offset.includes("px") ? parseFloat(offset) : offset,
        );
        stop.setAttribute("stop-color", "white");
        stop.setAttribute("stop-opacity", opacity);
        gradient.appendChild(stop);
      });
      context.defs.appendChild(gradient);

      const rect = document.createElementNS(
        SVG_NAMESPACE,
        "rect",
      ) as SVGScreenshotNodeType;
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(width));
      rect.setAttribute("height", String(height));
      rect.setAttribute("fill", `url(#${gradient.id})`);
      if (index) {
        rect.style.mixBlendMode = "multiply";
      }
      combinedMask.appendChild(rect);
    });
  }

  if (background) {
    path.setAttribute("fill", style.backgroundColor);
  }

  if (shadow) {
    path.style.filter = shadow.filter;
  }

  if (border) {
    if (!background) {
      path.setAttribute("fill", "none");
    }

    const { outline } = border;
    if (outline) {
      const outlinePath = path.cloneNode(true) as SVGScreenshotNodeType;
      outlinePath.setAttribute("fill", "none");
      outlinePath.setAttribute("stroke-width", outline.borderWidth + "px");
      outlinePath.setAttribute("stroke", outline.borderColor);
      outlinePath.setAttribute("stroke-linejoin", "round");
      outlinePath.setAttribute("stroke-linecap", "round");
      g.appendChild(outlinePath);
      path.setAttribute(
        "d",
        roundedRectPath(
          /** This is to ensure the new-connection connection type radio buttons are aligned */
          x - outline.borderWidth / 2 + (!showBorder ? borderWidth : 0),
          y - outline.borderWidth / 2 + (!showBorder ? borderWidth : 0),
          width + outline.borderWidth,
          height + outline.borderWidth,
          [rtl, rtr, rbr, rbl],
        ),
      );
    }

    if (border.type === "border") {
      path.setAttribute("stroke-width", border.borderWidth + "px");
      path.setAttribute("stroke", border.borderColor);
    } else {
      addSpecificBorders(g, x, y, width, height, style);
      path.setAttribute("stroke", "transparent");
    }
  }

  return path;
};

export const getRectanglePath = (
  style: CSSStyleDeclaration,
  { x, y, width, height }: Pick<SVGNodeLayout, "x" | "y" | "width" | "height">,
  { border }: Pick<Awaited<ReturnType<typeof getWhatToRenderOnSVG>>, "border">,
) => {
  const path = document.createElementNS(
    SVG_NAMESPACE,
    "path",
  ) as SVGScreenshotNodeType;

  const minDimension = Math.min(width, height);
  const [rtl = 0, rtr = 0, rbr = 0, rbl = 0] = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ].map((r) => {
    const radiusNumber = parseFloat(r);
    if (r.includes("%")) {
      const clampedPercentage = Math.min(50, radiusNumber);
      return (clampedPercentage / 100) * minDimension;
    }
    return radiusNumber;
  });

  const showBorder =
    border?.type == "border" && border.borderColor !== "rgba(0, 0, 0, 0)";

  const borderWidth = parseFloat(style.borderWidth);
  const visibleBorderWidth = showBorder ? borderWidth : 0;
  path.setAttribute(
    "d",
    roundedRectPath(
      /** This is to ensure the new-connection connection type radio buttons are aligned */
      x + visibleBorderWidth / 2,
      y + visibleBorderWidth / 2,
      width - visibleBorderWidth,
      height - visibleBorderWidth,
      [rtl, rtr, rbr, rbl],
    ),
  );

  return { path, showBorder, rtl, rtr, rbr, rbl, borderWidth };
};
