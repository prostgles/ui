import type { SVGContext } from "../../../app/domToSVG/elementToSVG";
import { addImageFromDataURL } from "../../../app/domToSVG/imgToSVG";
import type { Point } from "../../Charts";
import type { LinkLine, Rectangle } from "../CanvasChart";
import { DEFAULT_SHADOW } from "../roundRect";
import type { ShapeV2 } from "./drawShapes";

export const drawShapesOnSVG = (
  shapes: ShapeV2<any>[],
  context: SVGContext,
  g: SVGGElement,
  opts?: {
    scale?: number;
    translate?: { x: number; y: number };
    isChild?: boolean;
  },
) => {
  let transform = "";
  if (opts?.translate) {
    transform += `translate(${opts.translate.x}, ${opts.translate.y})`;
  }
  if (opts?.scale) {
    transform += ` scale(${opts.scale})`;
  }
  g.setAttribute("transform", transform);

  shapes.forEach((s) => {
    const opacity = s.opacity !== undefined ? s.opacity : 1;

    if (s.type === "image") {
      const [x, y] = s.coords;
      const localCanvas = document.createElement("canvas");
      localCanvas.width = s.w;
      localCanvas.height = s.h;
      const ctx = localCanvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");
      ctx.canvas.width = s.w;
      ctx.canvas.height = s.h;
      ctx.drawImage(s.image, 0, 0, s.w, s.h);
      const dataURL = localCanvas.toDataURL();
      addImageFromDataURL(g, dataURL, context, {
        style: {} as CSSStyleDeclaration,
        height: s.h,
        width: s.w,
        x,
        y,
      });
    } else if (s.type === "linkline") {
      drawSvgLinkLine(shapes, g as SVGElement, s);
    } else if (s.type === "rectangle") {
      const [x, y] = s.coords;
      const width = s.w;
      const height = s.h;

      let rectElement;
      if (s.borderRadius) {
        const pathElement = createSvgElement("path");
        pathElement.setAttribute(
          "d",
          createRoundedRect(x, y, width, height, s.borderRadius),
        );
        rectElement = pathElement;
      } else {
        rectElement = createSvgElement("rect", {
          x: x.toString(),
          y: y.toString(),
          width: width.toString(),
          height: height.toString(),
        });
      }
      if (s.elevation !== 0) {
        rectElement.setAttribute(
          "filter",
          `drop-shadow(${DEFAULT_SHADOW.offsetX}px ${DEFAULT_SHADOW.offsetY}px ${DEFAULT_SHADOW.blur} ${DEFAULT_SHADOW.color})`,
        );
      }

      if (s.fillStyle) {
        rectElement.setAttribute("fill", s.fillStyle);
      }
      if (s.strokeStyle) {
        rectElement.setAttribute("stroke", s.strokeStyle);
      }
      if (s.lineWidth) {
        rectElement.setAttribute("stroke-width", s.lineWidth.toString());
      }
      rectElement.setAttribute("opacity", opacity.toString());
      rectElement.setAttribute("stroke-linejoin", "bevel");

      g.appendChild(rectElement);

      // Handle children
      if (s.children?.length) {
        const childGroup = createSvgElement("g", {
          transform: `translate(${x}, ${y})`,
        });

        drawShapesOnSVG(
          s.children.map((cs) => {
            if (cs.type === "multiline" || cs.type === "polygon") {
              return {
                ...cs,
                coords: cs.coords.map(([cx, cy]) => [cx, cy] as Point),
              };
            }
            return {
              ...cs,
              opacity: (cs.opacity ?? 1) * opacity,
              coords: [cs.coords[0] + x, cs.coords[1] + y],
            };
          }),
          context,
          childGroup as SVGGElement,
          { isChild: true },
        );

        g.appendChild(childGroup);
      }
    } else if (s.type === "circle") {
      const [cx, cy] = s.coords;
      const circleElement = createSvgElement("circle", {
        cx: cx.toString(),
        cy: cy.toString(),
        r: s.r.toString(),
      });

      if (s.fillStyle) {
        circleElement.setAttribute("fill", s.fillStyle);
      }
      if (s.strokeStyle) {
        circleElement.setAttribute("stroke", s.strokeStyle);
      }
      if (s.lineWidth) {
        circleElement.setAttribute("stroke-width", s.lineWidth.toString());
      }
      circleElement.setAttribute("opacity", opacity.toString());

      g.appendChild(circleElement);
    } else if (s.type === "multiline") {
      const pathElement = createSvgElement("path");

      if (s.variant === "smooth" && s.coords.length > 2) {
        pathElement.setAttribute("d", drawSvgMonotoneXCurve(s.coords));
      } else {
        let pathData = "";
        s.coords.forEach(([x, y], i) => {
          if (i === 0) {
            pathData = `M ${x},${y}`;
          } else {
            pathData += ` L ${x},${y}`;
          }
        });
        pathElement.setAttribute("d", pathData);
      }

      pathElement.setAttribute("fill", "none");
      if (s.strokeStyle) {
        pathElement.setAttribute("stroke", s.strokeStyle);
      }
      if (s.lineWidth) {
        pathElement.setAttribute("stroke-width", s.lineWidth.toString());
      }
      pathElement.setAttribute("opacity", opacity.toString());
      pathElement.setAttribute("stroke-linecap", "round");

      g.appendChild(pathElement);
    } else if (s.type === "polygon") {
      const pathElement = createSvgElement("path");

      let pathData = "";
      s.coords.forEach(([x, y], i) => {
        if (i === 0) {
          pathData = `M ${x},${y}`;
        } else {
          pathData += ` L ${x},${y}`;
        }
      });
      pathData += " Z"; // Close the path

      pathElement.setAttribute("d", pathData);

      if (s.fillStyle) {
        pathElement.setAttribute("fill", s.fillStyle);
      }
      if (s.strokeStyle) {
        pathElement.setAttribute("stroke", s.strokeStyle);
      }
      if (s.lineWidth) {
        pathElement.setAttribute("stroke-width", s.lineWidth.toString());
      }
      pathElement.setAttribute("opacity", opacity.toString());

      g.appendChild(pathElement);
    } else if ((s.type as any) === "text") {
      const [x, y] = s.coords;
      const textElement = createSvgElement("text", {
        x: x.toString(),
        y: y.toString(),
        "text-anchor":
          s.textAlign === "center" ? "middle"
          : s.textAlign === "right" || s.textAlign === "end" ? "end"
          : "start",
      });

      if (s.font) {
        const span = document.createElement("span");
        span.style.font = s.font;
        const { fontSize, fontWeight, fontFamily } = span.style;
        textElement.setAttribute("font-family", fontFamily);
        textElement.setAttribute("font-size", fontSize);
        textElement.setAttribute("font-weight", fontWeight);
      }
      if (s.fillStyle) {
        textElement.setAttribute("fill", s.fillStyle);
      }
      textElement.setAttribute("opacity", opacity.toString());
      textElement.textContent = s.text;

      // Handle background if present
      if (s.background) {
        const txtSize = measureSvgText(s.text, s.font || "");
        const txtPadding = s.background.padding || 6;

        let bgX = x - txtSize.width / 2 - txtPadding;
        const bgY =
          y -
          (allLowerCase(s.text) ? 1 : 1) * txtSize.actualHeight -
          txtPadding;

        if (["left", "start"].includes(s.textAlign || "")) {
          bgX = x - txtPadding;
        } else if (["right", "end"].includes(s.textAlign || "")) {
          bgX = x - txtSize.width - txtPadding;
        }

        const bgWidth = txtSize.width + 2 * txtPadding;
        const bgHeight = txtSize.actualHeight + 2 * txtPadding;
        const radius = s.background.borderRadius || 0;

        const rectBg = createSvgElement("path");
        rectBg.setAttribute(
          "d",
          createRoundedRect(bgX, bgY, bgWidth, bgHeight, radius),
        );

        if (s.background.fillStyle) {
          rectBg.setAttribute("fill", s.background.fillStyle);
        }
        if (s.background.strokeStyle) {
          rectBg.setAttribute("stroke", s.background.strokeStyle);
        }
        if (s.background.lineWidth) {
          rectBg.setAttribute(
            "stroke-width",
            s.background.lineWidth.toString(),
          );
        }
        rectBg.setAttribute("opacity", opacity.toString());

        g.appendChild(rectBg);
      }

      g.appendChild(textElement);
    } else {
      console.error("Unexpected shape type:", (s as any).type);
    }
  });
};

/**
 * How much horizontal offset for control points (adjust for more/less curve)
 */
const controlPointFactor = 0.4;

export const drawSvgLinkLine = (
  shapes: (ShapeV2 | LinkLine)[],
  svg: SVGElement,
  linkLine: LinkLine,
) => {
  const { sourceId, targetId, sourceYOffset, targetYOffset } = linkLine;
  const r1 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === sourceId,
  );
  const r2 = shapes.find(
    (r): r is Rectangle => r.type === "rectangle" && r.id === targetId,
  );
  if (!r1 || !r2) return;
  const [x1, y1] = r1.coords;
  const [x2, y2] = r2.coords;

  const startP = [x1 + r1.w, y1 + sourceYOffset] as const;
  const endP = [x2, y2 + targetYOffset] as const;
  const startPoint = {
    x: startP[0],
    y: startP[1],
  };
  const endPoint = {
    x: endP[0],
    y: endP[1],
  };

  const dx = endPoint.x - startPoint.x;
  const horizontalOffset = Math.abs(dx) * controlPointFactor;
  const controlPoint1 = { x: startPoint.x + horizontalOffset, y: startPoint.y };
  const controlPoint2 = { x: endPoint.x - horizontalOffset, y: endPoint.y };

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    `M ${startPoint.x},${startPoint.y} C ${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${endPoint.x},${endPoint.y}`,
  );

  if (linkLine.strokeStyle) {
    path.setAttribute("stroke", linkLine.strokeStyle);
  }
  if (linkLine.lineWidth) {
    path.setAttribute("stroke-width", linkLine.lineWidth.toString());
  }
  path.setAttribute("fill", "none");
  if (linkLine.opacity !== undefined) {
    path.setAttribute("opacity", linkLine.opacity.toString());
  }

  svg.appendChild(path);
};

// Helper function to create SVG elements
const createSvgElement = (
  tagName: string,
  attrs: Record<string, string> = {},
) => {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg",
    tagName,
  );
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

// Helper for measuring text in SVG
export const measureSvgText = (text: string, font: string) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.visibility = "hidden";
  document.body.appendChild(svg);

  const textElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  textElement.setAttribute("font", font);
  textElement.textContent = text;
  svg.appendChild(textElement);

  const bbox = textElement.getBBox();
  document.body.removeChild(svg);

  return {
    width: bbox.width,
    height: bbox.height,
    actualHeight: bbox.height,
  };
};

// Helper for rounded rectangles in SVG
export const createRoundedRect = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  if (radius === 0) {
    return `M ${x},${y} h ${width} v ${height} h ${-width} z`;
  }

  return `
    M ${x + radius},${y}
    h ${width - 2 * radius}
    a ${radius},${radius} 0 0 1 ${radius},${radius}
    v ${height - 2 * radius}
    a ${radius},${radius} 0 0 1 ${-radius},${radius}
    h ${-(width - 2 * radius)}
    a ${radius},${radius} 0 0 1 ${-radius},${-radius}
    v ${-(height - 2 * radius)}
    a ${radius},${radius} 0 0 1 ${radius},${-radius}
    z
  `;
};

// Draw monotone X curve for SVG
export const drawSvgMonotoneXCurve = (coords: Point[]) => {
  if (coords.length < 2) return "";

  let path = `M ${coords[0]![0]},${coords[0]![1]}`;

  // Simple line segments for now (this would need to be replaced with actual monotone X curve algorithm)
  for (let i = 1; i < coords.length; i++) {
    path += ` L ${coords[i]![0]},${coords[i]![1]}`;
  }

  return path;
};

/** Big lower case text appears lower than needed */
export function allLowerCase(str: string) {
  return !!(str && str.toLowerCase() === str);
}
