import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useRef } from "react";
import type { useSchemaGraphControls } from "../SchemaGraphControls";
import { useCanvasPanZoom } from "./useCanvasPanZoom";
import { useDrawSchemaShapes } from "./useDrawSchemaShapes";
import { useSetPanShapes } from "./usePanShapes";
import { useSchemaShapes, type SchemaShape } from "./useSchemaShapes";

export type ColumnDisplayMode = "none" | "all" | "references";
export type ColumnColorMode = "default" | "root" | "on-update" | "on-delete";
export type ERDSchemaProps = Pick<
  ReturnType<typeof useSchemaGraphControls>,
  "displayMode" | "columnDisplayMode" | "columnColorMode"
>;
export const ERDSchema = ({
  displayMode,
  columnDisplayMode,
  columnColorMode,
}: ERDSchemaProps) => {
  const { dbs, theme } = usePrgl();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const { shapesRef, dbConfId, shapesVersion, canAutoPosition, dbConf } =
    useSchemaShapes({
      canvasRef,
      displayMode,
      columnDisplayMode,
      columnColorMode,
    });

  const { onRenderShapes, positionRef, scaleRef, setScaleAndPosition } =
    useDrawSchemaShapes({
      svgRef,
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
        (acc, { coords: [x, y], data }) => ({
          ...acc,
          [data.name]: {
            x,
            y,
          },
        }),
        {} as Record<string, { x: number; y: number }>,
      );
    if (!dbConfId || displayMode !== "all") return;
    void dbs.database_configs.update(
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
  }, [
    dbConfId,
    dbs.database_configs,
    displayMode,
    positionRef,
    scaleRef,
    shapesRef,
  ]);

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
    <FlexCol
      key={theme}
      ref={divRef}
      className="f-1 bg-color-1"
      style={{ overflow: "hidden" }}
    >
      <canvas ref={canvasRef} onWheel={handleWheel} className="f-1" />
      <svg
        ref={svgRef}
        className="text-search-svg absolute w-full h-full"
        style={{ pointerEvents: "none" }}
      />
    </FlexCol>
  );
};
