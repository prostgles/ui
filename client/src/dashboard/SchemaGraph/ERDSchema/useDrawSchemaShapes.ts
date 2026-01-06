import type { Deck, MapView, OrthographicView } from "deck.gl";
import { useCallback, useEffect, useRef } from "react";
import { createHiPPICanvas } from "src/dashboard/Charts/createHiPPICanvas";
import { isDefined } from "../../../utils/utils";
import type { LinkLine, Rectangle } from "../../Charts/CanvasChart";
import { drawShapes, type ShapeV2 } from "../../Charts/drawShapes/drawShapes";
import { getCssVariableValue } from "../../Charts/TimeChart/onRenderTimechart";
import type { ColumnColorMode } from "./ERDSchema";
import { getInitialPlacement } from "./getInitialPlacement";
import type { SchemaShape, useSchemaShapes } from "./useSchemaShapes";

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
    "shapesRef" | "shapesVersion" | "canAutoPosition" | "dbConf"
  > & {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    columnColorMode: ColumnColorMode;
  },
) => {
  const {
    shapesRef,
    canvasRef,
    shapesVersion,
    columnColorMode,
    canAutoPosition,
    dbConf,
  } = props;
  const positionRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  const animationRef = useRef<{
    progress: number;
    startedAt: number;
    duration: number;
    startPos?: [number, number];
  }>({ progress: 0, startedAt: 0, duration: 400 });

  const getShapes = useCallback(() => {
    if (animationRef.current.progress < 1 && shapesRef.current.length) {
      animationRef.current.startPos ??= shapesRef.current.find(
        (s) => s.type === "rectangle",
      )?.coords ?? [0, 0];
      const res = shapesRef.current.slice(0).map((s) =>
        s.type === "rectangle" ?
          {
            ...s,
            coords: interpolatePosition(
              animationRef.current.startPos!,
              s.coords,
              animationRef.current.progress,
            ),
          }
        : s,
      );
      animationRef.current.startedAt =
        animationRef.current.startedAt || Date.now();
      animationRef.current.progress = Math.min(
        1,
        (Date.now() - animationRef.current.startedAt) /
          animationRef.current.duration,
      );
      return res;
    }
    return shapesRef.current;
  }, [shapesRef]);

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
        const shapes = getShapes();
        const { width: w, height: h } =
          canvasRef.current.parentElement!.getBoundingClientRect();
        ctx.canvas.width = w;
        ctx.canvas.height = h;
        const canvas = canvasRef.current;
        createHiPPICanvas(canvas, w, h);

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
        if (animationRef.current.progress < 1) {
          requestAnimationFrame(() => onRenderShapes());
        }
      };
      requestAnimationFrame(render);
    },
    [canvasRef, getShapes, columnColorMode],
  );

  const prevdbConf = useRef(dbConf);
  useEffect(() => {
    if (dbConf && !prevdbConf.current) {
      const { table_schema_transform } = dbConf;
      if (table_schema_transform) {
        positionRef.current = table_schema_transform.translate;
        scaleRef.current = table_schema_transform.scale;
        onRenderShapes();
      }
    }
  }, [dbConf, onRenderShapes]);

  useEffect(() => {
    if (canAutoPosition) {
      shapesRef.current = getInitialPlacement(shapesRef.current.slice(0));
      /** Move links to end */
      shapesRef.current.sort((a, b) => a.type.localeCompare(b.type));
    }
    onRenderShapes();
  }, [shapesRef, onRenderShapes, shapesVersion, canAutoPosition]);

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

const interpolatePosition = (
  [startX, startY]: [number, number],
  [endX, endY]: [number, number],
  progress: number,
) =>
  [
    startX + (endX - startX) * progress,
    startY + (endY - startY) * progress,
  ] satisfies [number, number];

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
