import { useEffect, useRef, useState } from "react";
import { isDefined } from "../../../utils";
import type {
  ChartedText,
  Image,
  LinkLine,
  Rectangle,
} from "../../Charts/CanvasChart";
import { measureText } from "../../Charts/measureText";
import { getCssVariableValue } from "../../Charts/onRenderTimechart";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { ERDSchemaProps } from "./ERDSchema";
import { useFetchSchemaForDiagram } from "./useFetchSchemaForDiagram";
import { CASCADE_LEGEND } from "../SchemaGraph";

export type SchemaShape =
  | Rectangle<DBSchemaTableWJoins, { width: number } | undefined>
  | LinkLine;

export const useSchemaShapes = (
  props: ERDSchemaProps & {
    canvasRef: React.RefObject<HTMLCanvasElement>;
  },
) => {
  const { canvasRef, displayMode, columnDisplayMode, columnColorMode } = props;
  const shapesRef = useRef<SchemaShape[]>([]);
  const [shapesVersion, setShapesVersion] = useState(0);

  const { schemaInfo, dbConfId } = useFetchSchemaForDiagram(props);

  useEffect(() => {
    if (!schemaInfo) return;
    const { fkeys, tablesWithPositions } = schemaInfo;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const COL_SPACING = 30;
    const ICON_SIZE = 30;
    const PADDING = 10;
    const nodeShapes = tablesWithPositions
      .map((table, i) => {
        const offset = 50 * i;
        const x = table.position?.x ?? offset;
        const y = table.position?.y ?? offset;

        const getMeasuredChartedText = (
          node: ChartedText,
        ): ChartedText<{ width: number }> => ({
          ...node,
          data: { width: measureText(node, ctx, false).width },
        });

        const icon: Image | undefined = table.iconImage && {
          id: `${table.name}-icon`,
          type: "image",
          coords: [PADDING / 2, PADDING / 2],
          w: ICON_SIZE,
          h: ICON_SIZE,
          image: table.iconImage,
        };
        const header = getMeasuredChartedText({
          id: table.name + "-header",
          type: "text",
          text: table.label,
          coords: [
            !icon ? PADDING : icon.coords[0] + icon.w + PADDING / 2,
            COL_SPACING,
          ],
          font: "bold 22px Courier",
          fillStyle: getCssVariableValue("--text-0"),
        });

        const columns = table.columns.filter((c) =>
          columnDisplayMode === "none" ? false
          : columnDisplayMode === "references" ?
            fkeys.some(
              (fcons) =>
                fcons.conkey?.includes(c.ordinal_position) ||
                fcons.confkey?.includes(c.ordinal_position),
            )
          : true,
        );
        const colsAndDataTypes = columns.map((c, i) => {
          const colYOffset = COL_SPACING * (i + 2);

          const colName = getMeasuredChartedText({
            id: `${table.name}-${c.name}-col`,
            type: "text",
            coords: [PADDING, colYOffset],
            text: c.name,
            fillStyle: getCssVariableValue("--text-0"),
            font: "18px sans-serif",
          });

          const colDatatype = getMeasuredChartedText({
            id: `${table.name}-${c.name}-col-datatype`,
            type: "text",
            coords: [PADDING * 2 + colName.data.width, colYOffset],
            text: c.udt_name,
            fillStyle: getCssVariableValue("--text-2"),
            font: "16px sans-serif",
          });

          return [colName, colDatatype] as const;
        });

        const widestColContent = colsAndDataTypes.reduce(
          (acc, [col, colDataType]) => {
            return Math.max(
              acc,
              col.data.width + colDataType.data.width + 2 * PADDING,
            );
          },
          0,
        );
        const rectangleContentWidth = Math.max(
          header.data.width + header.coords[0] - PADDING,
          widestColContent,
        );

        const cols = colsAndDataTypes.flatMap(([colName]) => colName);
        const colsDataTypes = colsAndDataTypes.flatMap(
          ([colName, colDatatype]) => ({
            ...colDatatype,
            coords: [
              rectangleContentWidth - colDatatype.data.width + PADDING,
              colName.coords[1],
            ] satisfies [number, number],
          }),
        );

        const box: Rectangle<typeof table, { width: number } | undefined> = {
          id: table.name,
          type: "rectangle",
          coords: [x - PADDING, y - COL_SPACING - PADDING],
          w: rectangleContentWidth + 2 * PADDING,
          h: (cols.length + 1) * COL_SPACING + 2 * PADDING,
          fillStyle: getCssVariableValue("--bg-color-0"),
          strokeStyle: getCssVariableValue("--text-2"),
          lineWidth: 1,
          borderRadius: 12,
          children: [icon, header, ...cols, ...colsDataTypes].filter(isDefined),
          data: { ...table, columns },
          // elevation: 10,
        };

        return box;
      })
      .filter(isDefined)
      .filter((t) => {
        if (displayMode === "all") return true;
        if (displayMode === "relations") {
          return fkeys.some((fk) => fk.table_name === t.id);
        }
        return !fkeys.some((fk) => fk.table_name === t.id);
      });

    const linkShapes: LinkLine[] = fkeys
      .flatMap((fkCons, i) => {
        const tbl = nodeShapes.find(
          (n) => n.id === fkCons.table_name && fkCons.schema === "public",
        );
        const ftbl = nodeShapes.find(
          (n) => n.id === fkCons.ftable_name && fkCons.schema === "public",
        );
        if (!tbl || !ftbl) {
          if (displayMode !== "leaf") {
            console.warn("link not found", fkCons);
          }
          return undefined;
        }
        return fkCons.conkey?.map((key, i) => {
          const colIdx = tbl.data.columns.findIndex(
            (c) => c.ordinal_position === key,
          );
          const fkeyPos = fkCons.confkey?.[i];
          if (!isDefined(fkeyPos)) {
            return;
          }
          const fcolIdx = ftbl.data.columns.findIndex(
            (c) => c.ordinal_position === fkeyPos,
          );

          return {
            id: `${tbl.id}-link-${ftbl.id}`,
            type: "linkline",
            sourceId: ftbl.id,
            targetId: tbl.id,
            sourceYOffset: PADDING + COL_SPACING * (1 + fcolIdx + 0.5),
            targetYOffset: PADDING + COL_SPACING * (1 + colIdx + 0.5),
            lineWidth: 3,
            strokeStyle:
              columnColorMode === "root" ?
                (ftbl.data.rootColor ?? getCssVariableValue("--text-2"))
              : columnColorMode === "on-delete" ?
                CASCADE_LEGEND[fkCons.on_delete_action ?? "NOACTION"]
              : columnColorMode === "on-update" ?
                CASCADE_LEGEND[fkCons.on_update_action ?? "NOACTION"]
              : getCssVariableValue("--text-2"),
          } satisfies LinkLine;
        });
      })
      .filter(isDefined);

    const shapes = [...linkShapes, ...nodeShapes];
    shapesRef.current = shapes;
    setShapesVersion((v) => v + 1);
  }, [canvasRef, schemaInfo, displayMode, columnDisplayMode, columnColorMode]);

  return {
    shapesRef,
    schemaInfo,
    shapesVersion,
    dbConfId,
  };
};
