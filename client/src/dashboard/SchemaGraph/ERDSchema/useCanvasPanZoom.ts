import { useCallback } from "react";
import {
  clamp,
  maxScale,
  minScale,
  type useDrawSchemaShapes,
} from "./useDrawSchemaShapes";

export const useCanvasPanZoom = (
  props: ReturnType<typeof useDrawSchemaShapes> & {
    canvasRef: React.RefObject<HTMLCanvasElement>;
  },
) => {
  const { canvasRef, positionRef, scaleRef, setScaleAndPosition } = props;
  const handleZoom = useCallback(
    (newScale, mouseX, mouseY) => {
      // Clamp the scale value between min and max
      const clampedScale = clamp(newScale, minScale, maxScale);

      if (mouseX !== undefined && mouseY !== undefined) {
        const position = positionRef.current;
        // Zoom toward mouse position
        const factor = clampedScale / scaleRef.current;
        const newX = mouseX - factor * (mouseX - position.x);
        const newY = mouseY - factor * (mouseY - position.y);

        setScaleAndPosition({
          scale: clampedScale,
          position: { x: newX, y: newY },
        });
      } else {
        // Just zoom toward center if no mouse position provided
        setScaleAndPosition({ scale: clampedScale });
      }
    },
    [positionRef, scaleRef, setScaleAndPosition],
  );
  const handleWheel = useCallback(
    (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom factor based on wheel delta
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = scaleRef.current * zoomFactor;

      handleZoom(newScale, mouseX, mouseY);
    },
    [canvasRef, handleZoom, scaleRef],
  );

  return { handleWheel };
};
