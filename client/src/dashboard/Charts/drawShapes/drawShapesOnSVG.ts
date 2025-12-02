import { toFixed } from "src/app/domToSVG/utils/toFixed";
import type { SVGContext } from "../../../app/domToSVG/containers/elementToSVG";
import { addImageFromDataURL } from "../../../app/domToSVG/graphics/imgToSVG";
import type { Point } from "../../Charts";
import type { LinkLine, Rectangle } from "../CanvasChart";
import { DEFAULT_SHADOW } from "../roundRect";
import type { ShapeV2 } from "./drawShapes";
import { isDefined } from "@common/filterUtils";
import { asRGB } from "src/utils/colorUtils";
import { hashCode } from "src/utils/hashCode";

export const drawShapesOnSVG = (
  shapes: ShapeV2<any>[],
  context: SVGContext,
  g: SVGGElement,
  opts:
    | undefined
    | {
        scale?: number;
        translate?: { x: number; y: number };
        isChild?: boolean;
      },
  {
    width,
    height,
  }: {
    width: number;
    height: number;
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
      const [x, y] = s.coords.map((v) => toFixed(v)) as typeof s.coords;
      const width = toFixed(s.w);
      const height = toFixed(s.h);

      const rectElement = createRoundedRect(
        x,
        y,
        width,
        height,
        s.borderRadius,
      );

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
          childGroup,
          { isChild: true },
          { width, height },
        );

        g.appendChild(childGroup);
      }
    } else if (s.type === "circle") {
      const [cx, cy] = s.coords;
      const circleElement = createSvgElement("circle", {
        cx: toFixed(cx),
        cy: toFixed(cy),
        r: toFixed(s.r),
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
      // const pathElement = createSvgElement("path");

      // if (s.variant === "smooth" && s.coords.length > 2) {
      //   pathElement.setAttribute("d", drawSvgMonotoneXCurve(s.coords));
      // } else {
      //   let pathData = "";
      //   s.coords.forEach((point, i) => {
      //     const [x, y] = point.map((v) => toFixed(v)) as typeof point;
      //     if (i === 0) {
      //       pathData = `M ${x},${y}`;
      //     } else {
      //       pathData += ` L ${x},${y}`;
      //     }
      //   });
      //   pathElement.setAttribute("d", pathData);
      // }

      // pathElement.setAttribute("fill", "none");
      // if (s.strokeStyle) {
      //   pathElement.setAttribute("stroke", s.strokeStyle);
      // }
      // if (s.lineWidth) {
      //   pathElement.setAttribute("stroke-width", s.lineWidth.toString());
      // }
      // pathElement.setAttribute("opacity", opacity.toString());
      // pathElement.setAttribute("stroke-linecap", "round");

      // g.appendChild(pathElement);
      if (s.withGradient && s.coords.length > 2) {
        // Calculate minY for gradient positioning
        let minY = Infinity;
        s.coords.forEach(([_, y]) => {
          if (y < minY) minY = y;
        });

        const gradientLastStep = 0.3;
        const gradientMaxY = height - gradientLastStep * height;
        const peakSections: { x: number; y: number; index: number }[][] = [];

        s.coords.forEach(([x, y], index) => {
          if (y > gradientMaxY) {
            return;
          }

          const startNewSection = () => {
            const prevPoint = s.coords[index - 1];
            peakSections.push(
              [
                prevPoint && {
                  index: index - 1,
                  x: prevPoint[0],
                  y: prevPoint[1],
                },
                { x, y, index },
              ].filter(isDefined),
            );
          };

          if (!peakSections.length) {
            startNewSection();
            return;
          }
          const currentSection = peakSections.at(-1)!;
          const lastPoint = currentSection.at(-1)!;
          const nextPoint = s.coords[index + 1];
          if (index === lastPoint.index + 1) {
            currentSection.push({ x, y, index });
            if (nextPoint && nextPoint[1] > gradientMaxY) {
              // Close section
              currentSection.push({
                x: nextPoint[0],
                y: nextPoint[1],
                index: index + 1,
              });
            }
          } else {
            startNewSection();
          }
        });

        peakSections.forEach((sectionCoords) => {
          if (sectionCoords.length < 2) return;

          const uniqueShapeIdentifier = hashCode(
            sectionCoords
              .map((s) => {
                return [Math.round(s.x), Math.round(s.y)];
              })
              .join("") + s.strokeStyle,
          );
          const gradientId = `gradient-${uniqueShapeIdentifier}`;
          const defsElement = context.defs;

          const gradientElement = createSvgElement("linearGradient");
          gradientElement.setAttribute("id", gradientId);
          gradientElement.setAttribute("x1", "0");
          gradientElement.setAttribute("y1", toFixed(minY));
          gradientElement.setAttribute("x2", "0");
          gradientElement.setAttribute("y2", height);
          gradientElement.setAttribute("gradientUnits", "userSpaceOnUse");

          const rgba = asRGB(s.strokeStyle);
          const rgb = rgba.slice(0, 3).join(", ");

          const stops = [
            { offset: "0", opacity: "0.4" },
            { offset: "0.1", opacity: "0.2" },
            { offset: "0.2", opacity: "0.1" },
            { offset: gradientLastStep.toString(), opacity: "0" },
          ];

          stops.forEach(({ offset, opacity: stopOpacity }) => {
            const stopElement = createSvgElement("stop");
            stopElement.setAttribute("offset", offset);
            stopElement.setAttribute("stop-color", `rgb(${rgb})`);
            stopElement.setAttribute("stop-opacity", stopOpacity);
            gradientElement.appendChild(stopElement);
          });

          defsElement.appendChild(gradientElement);

          // Create gradient path
          const firstPoint = sectionCoords[0]!;
          const lastPoint = sectionCoords.at(-1)!;

          let pathData = `M ${toFixed(firstPoint.x)},${height}`;
          pathData += ` L ${toFixed(firstPoint.x)},${toFixed(firstPoint.y)}`;

          if (s.variant === "smooth" && sectionCoords.length > 2) {
            pathData +=
              " " +
              drawSvgMonotoneXCurve(
                sectionCoords.map(({ x, y }) => [x, y]),
                // true,
              ).substring(2); // Remove the initial "M x,y"
          } else {
            sectionCoords.forEach(({ x, y }) => {
              pathData += ` L ${toFixed(x)},${toFixed(y)}`;
            });
          }

          pathData += ` L ${toFixed(lastPoint.x)},${height}`;
          pathData += " Z";

          const gradientPath = createSvgElement("path");
          gradientPath.setAttribute("d", pathData);
          gradientPath.setAttribute("fill", `url(#${gradientId})`);
          gradientPath.setAttribute("opacity", opacity.toString());

          g.appendChild(gradientPath);
        });
      }

      // Draw the main line
      const pathElement = createSvgElement("path");

      if (s.variant === "smooth" && s.coords.length > 2) {
        pathElement.setAttribute("d", drawSvgMonotoneXCurve(s.coords));
      } else {
        let pathData = "";
        s.coords.forEach((point, i) => {
          const [x, y] = point.map((v) => toFixed(v)) as typeof point;
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
      s.coords.forEach((point, i) => {
        const [x, y] = point.map((v) => toFixed(v)) as typeof point;
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
    } else if ((s.type as unknown) === "text") {
      const [x, y] = s.coords;
      const textElement = createSvgElement("text", {
        x,
        y,
        "text-anchor":
          s.textAlign === "center" ? "middle"
          : s.textAlign === "right" || s.textAlign === "end" ? "end"
          : "start",
      });

      if (s.font) {
        textElement.style.font = s.font;
      }
      if (s.fillStyle) {
        textElement.setAttribute("fill", s.fillStyle);
      }
      textElement.setAttribute("opacity", opacity.toString());
      textElement.textContent = s.text;

      // Handle background if present
      if (s.background) {
        const txtSize = measureSvgText(s.text, s.font || "");
        const txtPadding = 2; //s.background.padding || 0;

        let bgX = x - txtSize.width / 2 - txtPadding;
        const bgY = y - txtSize.actualHeight;

        if (["left", "start"].includes(s.textAlign || "")) {
          bgX = x - txtPadding;
        } else if (["right", "end"].includes(s.textAlign || "")) {
          bgX = x - txtSize.width - txtPadding;
        }

        const bgWidth = txtSize.width + 2 * txtPadding;
        const bgHeight = txtSize.actualHeight + 2 * txtPadding;
        const radius = s.background.borderRadius || 0;

        // const rectBg = createSvgElement("path");
        // rectBg.setAttribute(
        //   "d",
        //   createRoundedRect(bgX, bgY, bgWidth, bgHeight, radius),
        // );
        const rectBg = createRoundedRect(bgX, bgY, bgWidth, bgHeight, radius);

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
    [
      `M ${startPoint.x},${startPoint.y}`,
      `C ${controlPoint1.x},${controlPoint1.y}`,
      `${controlPoint2.x},${controlPoint2.y}`,
      `${endPoint.x},${endPoint.y}`,
    ].join(" "),
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
const createSvgElement = <T extends keyof SVGElementTagNameMap>(
  tagName: T,
  attrs: Record<string, string | number> = {},
) => {
  const element = document.createElementNS<T>(
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
  radius: number | undefined,
) => {
  const rect = createSvgElement("rect", {
    x: toFixed(x),
    y: toFixed(y),
    width: toFixed(width),
    height: toFixed(height),
    ...(radius && {
      rx: toFixed(radius),
      ry: toFixed(radius),
    }),
  });
  return rect;
};

export const drawSvgMonotoneXCurve = (coords: Point[]) => {
  if (coords.length < 2) return "";

  let path = `M ${coords[0]![0]},${coords[0]![1]}`;

  if (coords.length === 2) {
    path += ` L ${coords[1]![0]},${coords[1]![1]}`;
    return path;
  }

  // Draw curves through all intermediate points
  for (let i = 0; i < coords.length - 1; i++) {
    const point = coords[i]!;
    const nextPoint = coords[i + 1]!;

    const xc = (point[0] + nextPoint[0]) / 2;
    const yc = (point[1] + nextPoint[1]) / 2;

    path += ` Q ${point[0]},${point[1]} ${xc},${yc}`;
  }

  // Complete the curve to the last point
  const lastPoint = coords[coords.length - 1]!;
  path += ` L ${lastPoint[0]},${lastPoint[1]}`;

  return path;
};

/** Big lower case text appears lower than needed */
export function allLowerCase(str: string) {
  return !!(str && str.toLowerCase() === str);
}
