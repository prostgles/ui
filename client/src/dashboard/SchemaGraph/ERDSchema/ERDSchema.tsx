import React, { useRef } from "react";
import { FlexCol } from "../../../components/Flex";
import type { SchemaGraphDisplayMode, SchemaGraphProps } from "../SchemaGraph";
import { useCanvasPanZoom } from "./useCanvasPanZoom";
import { useDrawSchemaShapes } from "./useDrawSchemaShapes";
import { useSetPanShapes } from "./usePanShapes";
import { useSchemaShapes } from "./useSchemaShapes";

export const ERDSchema = ({
  tables,
  db,
  dbs,
  connectionId,
  displayMode,
}: SchemaGraphProps & {
  displayMode: SchemaGraphDisplayMode;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const { shapesRef, dbConfId, shapesVersion } = useSchemaShapes({
    tables,
    db,
    dbs,
    connectionId,
    canvasRef,
    displayMode,
  });

  const { onRenderShapes, positionRef, scaleRef, setScaleAndPosition } =
    useDrawSchemaShapes({
      shapesRef,
      canvasRef,
      shapesVersion,
    });

  const { handleWheel } = useCanvasPanZoom({
    canvasRef,
    onRenderShapes,
    positionRef,
    scaleRef,
    setScaleAndPosition,
  });

  useSetPanShapes({
    setScaleAndPosition,
    positionRef,
    scaleRef,
    canvas: canvasRef.current,
    shapesRef,
    node: divRef.current,
    onRenderShapes,
    onPanEnded: () => {
      const newPositions = shapesRef.current
        .filter((s) => s.type === "rectangle")
        .reduce(
          (acc, s) => ({
            ...acc,
            [s.id as string]: {
              x: s.coords[0],
              y: s.coords[1],
            },
          }),
          {} as Record<string, { x: number; y: number }>,
        );
      if (!dbConfId) return;
      dbs.database_configs.update(
        {
          id: dbConfId,
        },
        {
          table_schema_positions: newPositions,
        },
      );
    },
  });
  return (
    <FlexCol ref={divRef} className="f-1">
      <canvas onWheel={handleWheel} className="f-1" ref={canvasRef} />
    </FlexCol>
  );
};
