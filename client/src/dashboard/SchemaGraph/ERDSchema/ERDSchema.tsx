import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useMemo, useRef } from "react";
import {
  CASCADE_LEGEND,
  type useSchemaGraphControls,
} from "../SchemaGraphControls";
import { useCanvasPanZoom } from "./useCanvasPanZoom";
import { useDrawSchemaShapes } from "./useDrawSchemaShapes";
import { useSetPanShapes } from "./usePanShapes";
import { useSchemaShapes, type SchemaShape } from "./useSchemaShapes";
import { getEntries } from "@common/utils";
import Chip from "@components/Chip";

export type ColumnDisplayMode = "none" | "all" | "references";
export type ColumnColorMode =
  | "schema"
  | "default"
  | "root"
  | "on-update"
  | "on-delete";
export type ERDSchemaProps = Pick<
  ReturnType<typeof useSchemaGraphControls>,
  "displayMode" | "columnDisplayMode" | "columnColorMode" | "selectedTables"
>;
export const ERDSchema = ({
  displayMode,
  columnDisplayMode,
  columnColorMode,
  selectedTables,
}: ERDSchemaProps) => {
  const { dbs, theme } = usePrgl();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const {
    shapesRef,
    schemaInfo,
    dbConfId,
    shapesVersion,
    canAutoPosition,
    dbConf,
  } = useSchemaShapes({
    canvasRef,
    displayMode,
    columnDisplayMode,
    columnColorMode,
    selectedTables,
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

  const legendItems = useMemo(() => {
    const { schemaColorMap } = schemaInfo || {};
    if (columnColorMode === "schema" && schemaColorMap) {
      return Array.from(schemaColorMap.entries()).map(([schema, color]) => ({
        label: schema,
        color,
      }));
    } else if (["on-delete", "on-update"].includes(columnColorMode)) {
      return getEntries(CASCADE_LEGEND).map(([label, { color, title }]) => ({
        label,
        color,
        title,
      }));
    }
  }, [columnColorMode, schemaInfo]);

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
      {legendItems && (
        <FlexCol
          style={{
            position: "absolute",
            right: "1em",
            top: "1em",
          }}
        >
          {" "}
          {legendItems.map(({ color, label }) => (
            <Chip key={label} style={{ color }}>
              {label}
            </Chip>
          ))}
        </FlexCol>
      )}
    </FlexCol>
  );
};
