import { useCallback, useEffect, useRef } from "react";
import { isDefined } from "../../../utils";
import { drawShapes } from "../../Charts/drawShapes/drawShapes";
import type { useSchemaShapes } from "./useSchemaShapes";

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
  },
) => {
  const { shapesRef, canvasRef, shapesVersion } = props;
  const positionRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  const onRenderShapes = useCallback(() => {
    const render = () => {
      if (!canvasRef.current) {
        return;
      }
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) {
        return;
      }
      const shapes = shapesRef.current;
      const { width: w, height: h } = canvasRef.current.getBoundingClientRect();
      ctx.canvas.width = w;
      ctx.canvas.height = h;
      const canvas = canvasRef.current;
      // createHiPPICanvas(canvas, w, h);

      drawShapes(shapes, canvas, {
        scale: scaleRef.current,
        translate: positionRef.current,
      });
    };
    requestAnimationFrame(render);
  }, [shapesRef, canvasRef]);

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
