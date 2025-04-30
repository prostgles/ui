import { useCallback, useEffect } from "react";
import { quickClone } from "../../../utils";
import type { Rectangle } from "../../Charts/CanvasChart";
import type { ShapeV2 } from "../../Charts/drawShapes/drawShapes";
import { setPan, type PanEvent } from "../../setPan";
import type { useDrawSchemaShapes } from "./useDrawSchemaShapes";

export const useSetPanShapes = ({
  node,
  canvas,
  shapesRef,
  onPanEnded,
  onRenderShapes,
  scaleRef,
  positionRef,
  setScaleAndPosition,
}: {
  node: HTMLDivElement | null;
  canvas: HTMLCanvasElement | null;
  shapesRef: React.MutableRefObject<ShapeV2[]>;
  onPanEnded: () => void;
} & ReturnType<typeof useDrawSchemaShapes>) => {
  const screenToWorld = useCallback(
    ([screenX, screenY]: [number, number]) => {
      const position = positionRef.current;
      const scale = scaleRef.current;
      const translatedX = (screenX - position.x) / scale;
      const translatedY = (screenY - position.y) / scale;
      return [translatedX, translatedY] satisfies [number, number];
    },
    [scaleRef, positionRef],
  );

  useEffect(() => {
    if (!node || !canvas) return;
    let panShapeInitial: Rectangle | undefined;
    let panShape: Rectangle | undefined;

    let startPanCoords: { screenX: number; screenY: number } | undefined;
    let startPanPosition: { x: number; y: number } | undefined;

    const setPanShape = (ev: Pick<PanEvent, "xNode" | "yNode">) => {
      const [xStart, yStart] = screenToWorld([ev.xNode, ev.yNode]);

      const shapes = shapesRef.current;
      const currPanShape = shapes.findLast((s): s is Rectangle => {
        if (s.type !== "rectangle") return false;
        const {
          coords: [x, y],
          w,
          h,
        } = s;
        return pointInRect([xStart, yStart], { x, y, w, h });
      });
      if (currPanShape !== panShape) {
        if (panShape) {
          panShape.strokeStyle = panShapeInitial?.strokeStyle ?? "";
        }
        panShape = currPanShape;
        panShapeInitial = panShape && quickClone(panShape);
        if (panShape) {
          node.style.cursor = "grabbing";
          panShape.strokeStyle = "red";
        } else {
          node.style.cursor = "";
        }
        onRenderShapes();
      }
    };

    return setPan(node, {
      onPointerMove: (ev) => {
        setPanShape(ev);
      },
      onPanStart: (ev) => {
        startPanCoords = { screenX: ev.xNode, screenY: ev.yNode };
        startPanPosition = { ...positionRef.current };

        const shapes = shapesRef.current;
        setPanShape(ev);
        if (panShape) {
          moveToEnd(shapes, shapes.indexOf(panShape));
        }
      },
      onPan: (ev) => {
        if (!startPanCoords || !startPanPosition) return;

        const currentScreenX = ev.xNode;
        const currentScreenY = ev.yNode;

        // Raw screen displacement since pan start
        const deltaScreenX = currentScreenX - startPanCoords.screenX;
        const deltaScreenY = currentScreenY - startPanCoords.screenY;

        /** Move whole canvas */
        if (!panShape || !panShapeInitial) {
          setScaleAndPosition({
            position: {
              x: startPanPosition.x + deltaScreenX,
              y: startPanPosition.y + deltaScreenY,
            },
          });
          return;
        }

        /** Move shape */
        const scale = scaleRef.current;
        // World displacement = screen displacement / scale
        const deltaWorldX = deltaScreenX / scale;
        const deltaWorldY = deltaScreenY / scale;

        panShape.coords = [
          panShapeInitial.coords[0] + deltaWorldX,
          panShapeInitial.coords[1] + deltaWorldY,
        ];
        onRenderShapes();
      },
      onPanEnd: () => {
        if (panShape) {
          panShape.strokeStyle = "black";
        }
        onRenderShapes();
        panShape = undefined;
        panShapeInitial = undefined;
        onPanEnded();
      },
      threshold: 1,
    });
  }, [
    canvas,
    node,
    onPanEnded,
    shapesRef,
    onRenderShapes,
    screenToWorld,
    positionRef,
    scaleRef,
    setScaleAndPosition,
  ]);
};

const pointInRect = (
  [x, y]: [number, number],
  rect: { x: number; y: number; w: number; h: number },
) => {
  return (
    x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
  );
};

const moveToEnd = (array: any[], index: number) => {
  if (index < 0 || index >= array.length) return array;

  const element = array.splice(index, 1)[0];

  array.push(element);

  return array;
};
