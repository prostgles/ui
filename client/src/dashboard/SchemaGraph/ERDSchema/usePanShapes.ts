import { useCallback, useEffect } from "react";
import { quickClone } from "../../../utils/utils";
import type { Rectangle } from "../../Charts/CanvasChart";
import type { ShapeV2 } from "../../Charts/drawShapes/drawShapes";
import { setPan, type PanEvent } from "../../setPan";
import type { useDrawSchemaShapes } from "./useDrawSchemaShapes";

export const useSetPanShapes = (
  props: {
    node: HTMLDivElement | null;
    canvas: HTMLCanvasElement | null;
    shapesRef: React.MutableRefObject<ShapeV2[]>;
    onPanEnded: () => void;
  } & ReturnType<typeof useDrawSchemaShapes>,
) => {
  const {
    node,
    canvas,
    shapesRef,
    onPanEnded,
    onRenderShapes,
    scaleRef,
    positionRef,
    setScaleAndPosition,
  } = props;

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
    let panShapeInitialCoords: Rectangle["coords"] | undefined;
    let panShape: Rectangle | undefined;

    let startPanCoords: { screenX: number; screenY: number } | undefined;
    let startPanPosition: { x: number; y: number } | undefined;
    const setPanShapeAndDraw = (newPanShape: Rectangle | undefined) => {
      if (newPanShape?.id === panShape?.id) {
        return;
      }
      panShape = newPanShape;
      panShapeInitialCoords = panShape && quickClone(panShape.coords);
      if (panShape) {
        node.style.cursor = "grabbing";
      } else {
        node.style.cursor = "";
      }
      onRenderShapes(panShape);
    };
    const findAndsetPanShape = (ev: Pick<PanEvent, "xNode" | "yNode">) => {
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
      setPanShapeAndDraw(currPanShape);
    };

    return setPan(node, {
      onPointerMove: (ev) => {
        findAndsetPanShape(ev);
      },
      onPanStart: (ev) => {
        startPanCoords = { screenX: ev.xNode, screenY: ev.yNode };
        startPanPosition = { ...positionRef.current };

        const shapes = shapesRef.current;
        findAndsetPanShape(ev);
        if (panShape) {
          moveToEnd(shapes, shapes.indexOf(panShape));
        }
      },
      onPan: (ev) => {
        if (!startPanCoords || !startPanPosition) {
          setPanShapeAndDraw(undefined);
          return;
        }

        const currentScreenX = ev.xNode;
        const currentScreenY = ev.yNode;

        // Raw screen displacement since pan start
        const deltaScreenX = currentScreenX - startPanCoords.screenX;
        const deltaScreenY = currentScreenY - startPanCoords.screenY;

        /** Move whole canvas */
        if (!panShape || !panShapeInitialCoords) {
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
          panShapeInitialCoords[0] + deltaWorldX,
          panShapeInitialCoords[1] + deltaWorldY,
        ];
        onRenderShapes(panShape);
      },
      onPanEnd: () => {
        setPanShapeAndDraw(undefined);
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
