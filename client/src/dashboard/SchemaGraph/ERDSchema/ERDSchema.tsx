import React, { useCallback, useRef } from "react";
import { FlexCol } from "../../../components/Flex";
import type { SchemaGraphProps } from "../SchemaGraph";
import type { useSchemaGraphControls } from "../SchemaGraphControls";
import { useCanvasPanZoom } from "./useCanvasPanZoom";
import { useDrawSchemaShapes } from "./useDrawSchemaShapes";
import { useSetPanShapes } from "./usePanShapes";
import { useSchemaShapes, type SchemaShape } from "./useSchemaShapes";
import type { Rectangle } from "../../Charts/CanvasChart";

export type ColumnDisplayMode = "none" | "all" | "references";
export type ColumnColorMode = "default" | "root" | "on-update" | "on-delete";
export type ERDSchemaProps = SchemaGraphProps &
  Pick<
    ReturnType<typeof useSchemaGraphControls>,
    "displayMode" | "columnDisplayMode" | "columnColorMode"
  >;
export const ERDSchema = ({
  tables,
  db,
  dbs,
  connectionId,
  displayMode,
  columnDisplayMode,
  columnColorMode,
}: ERDSchemaProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const { shapesRef, dbConfId, shapesVersion, canAutoPosition, dbConf } =
    useSchemaShapes({
      tables,
      db,
      dbs,
      connectionId,
      canvasRef,
      displayMode,
      columnDisplayMode,
      columnColorMode,
    });

  const { onRenderShapes, positionRef, scaleRef, setScaleAndPosition } =
    useDrawSchemaShapes({
      shapesRef,
      canvasRef,
      shapesVersion,
      columnColorMode,
      canAutoPosition,
      dbConf,
    });

  const { handleWheel } = useCanvasPanZoom({
    canvasRef,
    onRenderShapes,
    positionRef,
    scaleRef,
    setScaleAndPosition,
  });

  const onPanEnded = useCallback(() => {
    const newPositions = shapesRef.current
      .filter(
        (s): s is Extract<SchemaShape, { type: "rectangle" }> =>
          s.type === "rectangle",
      )
      .reduce(
        (acc, { id, coords: [x, y] }) => ({
          ...acc,
          [id as string]: {
            x,
            y,
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
        table_schema_transform: {
          scale: scaleRef.current,
          translate: positionRef.current,
        },
      },
    );
  }, [dbConfId, dbs.database_configs, positionRef, scaleRef, shapesRef]);

  useSetPanShapes({
    setScaleAndPosition,
    positionRef,
    scaleRef,
    canvas: canvasRef.current,
    //@ts-ignore
    shapesRef,
    node: divRef.current,
    onRenderShapes,
    onPanEnded,
  });
  return (
    <FlexCol ref={divRef} className="f-1  bg-color-1">
      <canvas onWheel={handleWheel} className="f-1" ref={canvasRef} />
    </FlexCol>
  );
};
