import type { Point } from "../../Charts";
import type { Image, LinkLine, Shape } from "../CanvasChart";
import { drawMonotoneXCurve } from "../drawMonotoneXCurve";
import { measureText } from "../measureText";
import { roundRect } from "../roundRect";
import { drawLinkLine } from "./shortestLinkLineV2";
export type ShapeV2<T = void> = Shape<T> | LinkLine<T> | Image<T>;
const getWH = (canvas: HTMLCanvasElement) => {
  return {
    w: canvas.offsetWidth,
    h: canvas.offsetHeight,
  };
};
export const getCtx = (canvas: HTMLCanvasElement) => {
  return canvas.getContext("2d");
};

let lastDrawn = {};
export const drawShapes = (
  shapes: ShapeV2[],
  canvas: HTMLCanvasElement,
  opts?: {
    scale?: number;
    translate?: { x: number; y: number };
    isChild?: boolean;
  },
) => {
  const { w, h } = getWH(canvas);
  const ctx = getCtx(canvas);
  if (!ctx) return;
  lastDrawn = {
    shapes,
    canvas,
    opts,
  };
  if (!opts?.isChild) {
    ctx.clearRect(0, 0, w, h);
  }

  if (opts?.scale || opts?.translate) {
    const { scale, translate: position } = opts;
    ctx.save();
    if (position) {
      ctx.translate(position.x, position.y);
    }
    if (scale) {
      ctx.scale(scale, scale);
    }
  }

  shapes.forEach((s) => {
    ctx.lineJoin = "bevel";
    if (s.type === "image") {
      ctx.drawImage(s.image, ...s.coords, s.w, s.h);
    } else if (s.type === "linkline") {
      drawLinkLine(shapes, canvas, s, opts);
    } else if (s.type === "rectangle") {
      const {
        coords: [x1, y1],
      } = s;
      ctx.fillStyle = s.fillStyle;
      ctx.lineWidth = s.lineWidth;
      ctx.strokeStyle = s.strokeStyle;
      const x2 = s.w + x1;
      const w = x2 - x1;
      if (s.borderRadius) {
        ctx.lineJoin = "round";
        roundRect(ctx, x1, y1, w, s.h, s.borderRadius);
      } else {
        ctx.beginPath();
        ctx.rect(x1, y1, w, s.h);
      }
      ctx.fill();
      ctx.stroke();
      if (s.children?.length) {
        drawShapes(
          s.children.map((cs) => {
            /** Child shape coords start from parent rect x,y */
            if (cs.type === "multiline" || cs.type === "polygon") {
              return {
                ...cs,
                coords: cs.coords.map(
                  ([x, y]) => [x + x1, y + y1] satisfies Point,
                ),
              };
            }
            // if (cs.type === "linkline") {
            //   throw new Error("linkline not supported in child shapes");
            // }
            return {
              ...cs,
              coords: [cs.coords[0] + x1, cs.coords[1] + y1],
            };
          }),
          canvas,
          {
            isChild: true,
          },
        );
      }
    } else if (s.type === "circle") {
      const {
        coords: [x1, y1],
      } = s;
      ctx.fillStyle = s.fillStyle;
      ctx.lineWidth = s.lineWidth;
      ctx.strokeStyle = s.strokeStyle;
      ctx.beginPath();
      ctx.arc(x1, y1, s.r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (s.type === "multiline") {
      const { coords } = s;
      ctx.lineCap = "round";
      ctx.lineWidth = s.lineWidth;
      ctx.strokeStyle = s.strokeStyle;

      if (s.variant === "smooth" && coords.length > 2) {
        drawMonotoneXCurve(ctx, coords);
      } else {
        coords.forEach(([x, y], i) => {
          if (!i) {
            ctx.beginPath();
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      }
    } else if (s.type === "polygon") {
      const { coords } = s;
      ctx.fillStyle = s.fillStyle;
      ctx.lineWidth = s.lineWidth;
      ctx.strokeStyle = s.strokeStyle;
      ctx.beginPath();
      coords.map(([x, y], i) => {
        if (!i) {
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    } else if ((s.type as any) === "text") {
      const { textAlign = "start", coords } = s;

      if (s.background) {
        const txtSize = measureText(s, ctx, opts?.isChild ? false : true);
        const txtPadding = s.background.padding || 6;
        ctx.fillStyle = s.background.fillStyle ?? ctx.fillStyle;
        if (s.background.strokeStyle) {
          ctx.strokeStyle = s.background.strokeStyle;
        }
        ctx.lineWidth = s.background.lineWidth ?? ctx.lineWidth;
        let x = coords[0] - txtSize.width / 2 - txtPadding;
        const y =
          coords[1] -
          (allLowerCase(s.text) ? 1 : 1) * txtSize.actualHeight -
          txtPadding;

        if (["left", "start"].includes(textAlign)) {
          x = coords[0] - txtPadding;
        } else if (["right", "end"].includes(textAlign)) {
          x = coords[0] - txtSize.width - txtPadding;
        }

        roundRect(
          ctx,
          x,
          y,
          txtSize.width + 2 * txtPadding,
          txtSize.actualHeight + 2 * txtPadding,
          s.background.borderRadius || 0,
        );
        ctx.closePath();
        if (s.background.strokeStyle) {
          ctx.stroke();
        }
        ctx.fill();
      }

      ctx.fillStyle = s.fillStyle;
      ctx.textAlign = textAlign;
      ctx.font = s.font || ctx.font;
      ctx.fillText(s.text, coords[0], coords[1]);
      // s.text.split("\n").map(text => {
      //   ctx.fillText(text, coords[0], coords[1]);
      // })
    } else throw "Unexpected shape type: " + (s as any).type;
  });
  if (opts?.scale || opts?.translate) {
    ctx.restore();
  }
};

/** Big lower case text appears lower than needed */
export function allLowerCase(str) {
  return !!(str && str.toLowerCase() === str);
}
