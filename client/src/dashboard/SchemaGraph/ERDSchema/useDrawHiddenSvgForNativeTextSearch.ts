import { useCallback, useEffect, useState } from "react";
import { SVG_NAMESPACE } from "src/app/domToSVG/domToSVG";
import type { ShapeV2 } from "src/dashboard/Charts/drawShapes/drawShapes";
import { drawShapesOnSVG } from "src/dashboard/Charts/drawShapes/drawShapesOnSVG";

/**
 * Hacky approach but better than nothing for now
 */
export const useDrawHiddenSvgForNativeTextSearch = (
  svgRef: React.RefObject<SVGSVGElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
) => {
  const [didSearch, setDidSearch] = useState(false);

  const drawShapesOnHiddenSvg = useCallback(() => {
    const drawnShapes = canvasRef.current?._drawn;
    if (!drawnShapes || !didSearch) return;
    const { shapes, scale, translate } = drawnShapes;
    const transformedG = document.createElementNS(SVG_NAMESPACE, "g");
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const shapesWithText = shapes
      .filter(
        (s): s is Extract<ShapeV2, { type: "rectangle" }> =>
          s.type === "rectangle",
      )
      .map((s) => ({
        ...s,
        elevation: 10,
        fillStyle: "transparent",
        strokeStyle: "transparent",
        children: s.children
          ?.filter((c) => c.type === "text")
          .map((c) => ({
            ...c,
            fillStyle: "transparent",
            background: undefined,
          })),
      }));
    drawShapesOnSVG(
      shapesWithText,
      {} as any,
      transformedG,
      {
        scale,
        translate,
      },
      {
        width,
        height,
      },
    );
    if (svgRef.current) {
      svgRef.current.firstChild?.remove();
      svgRef.current.appendChild(transformedG);
    }
  }, [canvasRef, svgRef, didSearch]);

  useEffect(() => {
    if (didSearch) {
      drawShapesOnHiddenSvg();
    }
  }, [didSearch, drawShapesOnHiddenSvg]);

  useEffect(() => {
    const onCtrlF = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        console.log("Ctrl+F pressed - open search");
        setDidSearch(true);
      }
    };
    window.addEventListener("keydown", onCtrlF);
    return () => {
      window.removeEventListener("keydown", onCtrlF);
    };
  }, []);

  return {
    drawShapesOnHiddenSvg,
  };
};
