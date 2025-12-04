import { fromEntries, getEntries } from "@common/utils";
import { SVG_NAMESPACE } from "../domToSVG";
import type { SVGScreenshotNodeType } from "../domToThemeAwareSVG";
import type { getWhatToRenderOnSVG } from "../utils/getWhatToRenderOnSVG";
import { addSpecificBorders, roundedRectPath } from "./bgAndBorderToSVG";
import type { SVGNodeLayout } from "./elementToSVG";
import { getBoxShadowAsDropShadow } from "./shadowToSVG";
export const BORDER_ELEMENT_TYPES = ["rect", "path", "line"] as const;

export const rectangleToSVG = (
  g: SVGGElement,
  element: HTMLElement,
  style: CSSStyleDeclaration,
  { x, y, width, height }: Pick<SVGNodeLayout, "x" | "y" | "width" | "height">,
  {
    border,
    background,
    backdropFilter,
  }: Pick<
    Awaited<ReturnType<typeof getWhatToRenderOnSVG>>,
    "background" | "border" | "backdropFilter"
  >,
  bboxCode: string,
) => {
  const shadow = getBoxShadowAsDropShadow(style);
  const scrollMask =
    style.backdropFilter &&
    style.mask &&
    style.mask.includes("linear-gradient");
  if (!border && !background && !shadow && !scrollMask && !backdropFilter) {
    return;
  }

  let _path: ReturnType<typeof getRectanglePath> | undefined;
  const getPath = () => {
    if (_path) return _path;
    const entries = getEntries({
      border,
      background,
      shadow,
      scrollMask,
      backdropFilter,
    } as const);
    const _purpose = fromEntries(entries.map(([k, v]) => [k, v]));
    const { path, showBorder, rtl, rtr, rbr, rbl, borderWidth } =
      getRectanglePath(style, { x, y, width, height }, { border });
    path._domElement = element;
    path._bboxCode = bboxCode;
    path._purpose = _purpose;

    /** This is required to make backgroundSameAsRenderedParent work as expected */
    path.setAttribute("fill", "none");

    g.appendChild(path);
    _path = { path, showBorder, rtl, rtr, rbr, rbl, borderWidth };
    return _path;
  };

  const maskLinearGradients = style.maskImage.split("linear-gradient(");
  const blendModes = style.maskComposite.split(", ");
  if (
    maskLinearGradients.length > 1 &&
    blendModes.every((b) => b === "source-in")
  ) {
    const masks = maskLinearGradients.slice(1);

    masks.forEach((grad, index) => {
      if (index) {
        // Mask combining does not work
        return;
      }

      g.style.maskImage = style.maskImage;
      g.style.maskSize = `${width}px ${height}px`;
      g.style.maskPosition = `${x}px ${0}px`;
      g.style.maskPosition = `0px 0px`;
    });
  }

  if (background) {
    getPath().path.setAttribute("fill", background);
  }

  if (style.animation) {
    getPath().path.style.animation = style.animation;
  }

  // TODO: shadow and border must be drawn outside the overflow clip path
  if (shadow) {
    getPath().path.style.filter = shadow.filter;
  }

  if (border) {
    const { outline } = border;
    if (outline) {
      // TODO: outline  must be drawn outside the overflow clip path
      const outlineNode = getPath().path.cloneNode(
        true,
      ) as SVGScreenshotNodeType;
      outlineNode.setAttribute("fill", "none");
      outlineNode.setAttribute("stroke-width", outline.borderWidth + "px");
      outlineNode.setAttribute("stroke", outline.borderColor);
      outlineNode.setAttribute("stroke-linejoin", "round");
      outlineNode.setAttribute("stroke-linecap", "round");
      g.appendChild(outlineNode);
      // const { path, rtl, rtr, rbr, rbl, showBorder, borderWidth } = getPath();
      // if (path instanceof SVGRectElement) {
      //   throw new Error("Outline not supported for rect element");
      // }
      // path.setAttribute(
      //   "d",
      //   roundedRectPath(
      //     /** This is to ensure the new-connection connection type radio buttons are aligned */
      //     x - outline.borderWidth / 2 + (!showBorder ? borderWidth : 0),
      //     y - outline.borderWidth / 2 + (!showBorder ? borderWidth : 0),
      //     width + outline.borderWidth,
      //     height + outline.borderWidth,
      //     [rtl, rtr, rbr, rbl],
      //   ),
      // );
    }

    if (border.type === "border") {
      getPath().path.setAttribute("stroke-width", border.borderWidth + "px");
      getPath().path.setAttribute("stroke", border.borderColor);
    } else if (border.type === "borders") {
      addSpecificBorders(g, x, y, width, height, style);
    }
  }

  return _path;
};

const getRectanglePath = (
  style: CSSStyleDeclaration,
  { x, y, width, height }: Pick<SVGNodeLayout, "x" | "y" | "width" | "height">,
  { border }: Pick<Awaited<ReturnType<typeof getWhatToRenderOnSVG>>, "border">,
) => {
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
  const adjusted = {
    x: x + visibleBorderWidth / 2,
    y: y + visibleBorderWidth / 2,
    width: width - visibleBorderWidth,
    height: height - visibleBorderWidth,
  };

  /** Use recangle if possible */
  const hasSingleRadius = new Set([rtl, rtr, rbr, rbl]).size === 1;
  const hasConstantBorder = !border || border.type === "border";
  if (hasSingleRadius && hasConstantBorder) {
    const rect = document.createElementNS(SVG_NAMESPACE, "rect") as Extract<
      SVGScreenshotNodeType,
      SVGRectElement
    >;
    rect.setAttribute("x", adjusted.x);
    rect.setAttribute("y", adjusted.y);
    rect.setAttribute("width", adjusted.width);
    rect.setAttribute("height", adjusted.height);
    rect.setAttribute("rx", rtl);
    rect.setAttribute("ry", rtl);
    return { path: rect, showBorder, rtl, rtr, rbr, rbl, borderWidth };
  }

  const path = document.createElementNS(SVG_NAMESPACE, "path") as Extract<
    SVGScreenshotNodeType,
    SVGPathElement
  >;
  path.setAttribute(
    "d",
    roundedRectPath(
      /** This is to ensure the new-connection connection type radio buttons are aligned */
      adjusted.x,
      adjusted.y,
      adjusted.width,
      adjusted.height,
      [rtl, rtr, rbr, rbl],
    ),
  );

  path satisfies SVGElementTagNameMap[(typeof BORDER_ELEMENT_TYPES)[number]];
  return { path, showBorder, rtl, rtr, rbr, rbl, borderWidth };
};
