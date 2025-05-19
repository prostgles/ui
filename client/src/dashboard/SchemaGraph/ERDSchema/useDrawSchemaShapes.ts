import { useCallback, useEffect, useRef } from "react";
import { isDefined } from "../../../utils";
import type { LinkLine, Rectangle } from "../../Charts/CanvasChart";
import { drawShapes, type ShapeV2 } from "../../Charts/drawShapes/drawShapes";
import { getCssVariableValue } from "../../Charts/onRenderTimechart";
import type { ColumnColorMode } from "./ERDSchema";
import type { SchemaShape, useSchemaShapes } from "./useSchemaShapes";
import type { Deck, MapView, OrthographicView } from "deck.gl";

export const minScale = 0.1;
export const maxScale = 5;
const minPan = -2000;
const maxPan = 2000;

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const useDrawSchemaShapes = (
  props: Pick<
    ReturnType<typeof useSchemaShapes>,
    "shapesRef" | "shapesVersion"
  > & {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    columnColorMode: ColumnColorMode;
  },
) => {
  const { shapesRef, canvasRef, shapesVersion, columnColorMode } = props;
  const positionRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  const onRenderShapes = useCallback(
    (hoveredRectangle?: Rectangle) => {
      const render = () => {
        if (!canvasRef.current) {
          return;
        }
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) {
          return;
        }
        const shapes = shapesRef.current;
        const { width: w, height: h } =
          canvasRef.current.getBoundingClientRect();
        ctx.canvas.width = w;
        ctx.canvas.height = h;
        const canvas = canvasRef.current;
        // createHiPPICanvas(canvas, w, h);

        let drawnShapes = shapes.slice(0);
        if (hoveredRectangle) {
          const relatedShapes: SchemaShape[] = [];
          const otherShapes: SchemaShape[] = [];
          const hoveredRectangleLinks = shapes.filter(
            (s): s is LinkLine =>
              s.type === "linkline" &&
              [s.sourceId, s.targetId].includes(hoveredRectangle.id),
          );
          shapes.forEach((s) => {
            if (
              /** Needed to ensure rectangles without links are matched */
              s.id === hoveredRectangle.id ||
              (s.type === "rectangle" &&
                hoveredRectangleLinks.some((l) =>
                  [l.sourceId, l.targetId].includes(s.id),
                )) ||
              /** Is a link starting or ending from the hovered rectangle */
              (s.type === "linkline" &&
                [s.sourceId, s.targetId].includes(hoveredRectangle.id))
            ) {
              relatedShapes.push({
                ...s,
                strokeStyle:
                  columnColorMode !== "default" ?
                    s.strokeStyle
                  : getCssVariableValue("--active"),
              });
            } else {
              otherShapes.push({
                ...s,
                opacity: 0.4,
              });
            }
          });
          drawnShapes = [...otherShapes, ...relatedShapes];
        }
        drawShapes(drawnShapes as ShapeV2[], canvas, {
          scale: scaleRef.current,
          translate: positionRef.current,
        });
        const _drawn = {
          shapes: drawnShapes as ShapeV2[],
          scale: scaleRef.current,
          translate: positionRef.current,
        };
        canvas._drawn = _drawn;
      };
      requestAnimationFrame(render);
    },
    [canvasRef, shapesRef, columnColorMode],
  );

  useEffect(() => {
    onRenderShapes();
  }, [shapesRef, onRenderShapes, shapesVersion]);

  const setScaleAndPosition = useCallback(
    ({
      scale,
      position,
    }: Partial<{
      scale: number;
      position: { x: number; y: number };
    }>) => {
      if (isDefined(scale)) {
        scaleRef.current = clamp(scale, minScale, maxScale);
      }
      if (isDefined(position)) {
        positionRef.current = {
          x: clamp(position.x, minPan, maxPan),
          y: clamp(position.y, minPan, maxPan),
        };
      }
      onRenderShapes();
    },
    [onRenderShapes, positionRef, scaleRef],
  );

  return { onRenderShapes, positionRef, scaleRef, setScaleAndPosition };
};

declare global {
  interface HTMLCanvasElement {
    _drawn?: {
      shapes: ShapeV2[];
      scale: number;
      translate: { x: number; y: number };
    };
    _deckgl?: Deck<OrthographicView[] | MapView[]>;
  }
}
