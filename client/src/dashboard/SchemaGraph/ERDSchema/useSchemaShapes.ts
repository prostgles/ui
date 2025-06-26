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
import type {
  DBSchemaTableColumn,
  DBSchemaTableWJoins,
} from "../../Dashboard/dashboardUtils";
import type { ERDSchemaProps } from "./ERDSchema";
import { useFetchSchemaForDiagram } from "./useFetchSchemaForDiagram";
import { CASCADE_LEGEND } from "../SchemaGraphControls";

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
  const { schemaInfo, dbConfId, dbConf } = useFetchSchemaForDiagram(props);

  useEffect(() => {
    if (!schemaInfo || !dbConf) return;
    const { fkeys, tablesWithPositions } = schemaInfo;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const COL_SPACING = 30;
    const ICON_SIZE = 30;
    const COL_ICON_SIZE = 20;
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
        const headerfillStyle = getCssVariableValue("--text-0");
        const header = getMeasuredChartedText({
          id: table.name + "-header",
          type: "text",
          text: table.label,
          coords: [
            !icon ? PADDING : icon.coords[0] + icon.w + PADDING / 2,
            COL_SPACING,
          ],
          font: "bold 22px Courier",
          fillStyle:
            columnColorMode === "root" ?
              (table.rootColor ?? headerfillStyle)
            : headerfillStyle,
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
        let hasColIcon = false;
        const colsAndDataTypes = columns.map((c, i) => {
          const colYOffset = COL_SPACING * (i + 2);

          let textFillStyle = getCssVariableValue("--text-0");
          if (columnColorMode === "root" && c.references?.length) {
            textFillStyle =
              getRootTable(c.references, tablesWithPositions)?.rootColor ??
              textFillStyle;
          }
          const colName = getMeasuredChartedText({
            id: `${table.name}-${c.name}-col`,
            type: "text",
            coords: [PADDING, colYOffset],
            text: c.name,
            fillStyle: textFillStyle,
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

          const { fkey, nullable, pkey, unqiue } =
            schemaInfo.columnConstraintIcons;
          const colIconImage =
            c.is_pkey ? pkey
            : c.references?.length ? fkey
            : c.is_nullable ? nullable
            : (
              table.info.uniqueColumnGroups?.some(
                (ug) => ug.length === 1 && ug.includes(c.name),
              )
            ) ?
              unqiue
            : undefined;

          const colIcon =
            colIconImage &&
            ({
              id: `${table.name}-${c.name}-col-icon`,
              type: "image",
              coords: [PADDING * 2 + colName.data.width, colYOffset],
              image: colIconImage,
              h: COL_ICON_SIZE,
              w: COL_ICON_SIZE,
            } satisfies Image);
          hasColIcon = hasColIcon || !!colIcon;
          return [colName, colDatatype, colIcon] as const;
        });

        const widestColContent = colsAndDataTypes.reduce(
          (acc, [col, colDataType]) => {
            return Math.max(
              acc,
              col.data.width +
                colDataType.data.width +
                (hasColIcon ? COL_ICON_SIZE : 0) +
                3 * PADDING,
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
          ([colName, colDatatype, colIcon]) => ({
            ...colDatatype,
            coords: [
              rectangleContentWidth - colDatatype.data.width - 2 * PADDING,
              colName.coords[1],
            ] satisfies [number, number],
          }),
        );
        const colsIcons = colsAndDataTypes
          .flatMap(
            ([colName, colDatatype, colIcon]) =>
              colIcon && {
                ...colIcon,
                coords: [
                  rectangleContentWidth - colIcon.w + PADDING,
                  colName.coords[1] - colIcon.h + 4,
                ] satisfies [number, number],
              },
          )
          .filter(isDefined);

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
          children: [
            icon,
            header,
            ...cols,
            ...colsDataTypes,
            ...colsIcons,
          ].filter(isDefined),
          data: { ...table, columns },
          // elevation: 10,
        };

        return box;
      })
      .filter(isDefined)
      .filter((t) => {
        if (displayMode === "all") return true;
        if (displayMode === "relations") {
          return t.data.references.length || t.data.referencedBy.length;
        }
        return !t.data.references.length && !t.data.referencedBy.length;
      });

    const linkShapes: LinkLine[] = fkeys
      .flatMap((fkCons) => {
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
  }, [
    canvasRef,
    schemaInfo,
    displayMode,
    columnDisplayMode,
    columnColorMode,
    dbConf,
  ]);

  return {
    shapesRef,
    schemaInfo,
    shapesVersion,
    dbConfId,
    dbConf,
    canAutoPosition: dbConf && !dbConf.table_schema_positions,
  };
};

import type { ValidatedColumnInfo } from "prostgles-types";
const getRootTable = <T extends DBSchemaTableWJoins>(
  references: ValidatedColumnInfo["references"],
  tables: T[],
  prevTables: string[] = [],
): T | undefined => {
  if (!references) return;
  const nextReferences: ValidatedColumnInfo["references"][] = [];
  for (const ref of references) {
    const table = tables.find((t) => t.name === ref.ftable);
    if (!table) continue;
    const referencedColumns = table.columns.filter(({ name }) =>
      ref.fcols.includes(name),
    );
    if (referencedColumns.some(({ is_pkey }) => is_pkey)) {
      return table;
    }
    referencedColumns.forEach((c) => {
      nextReferences.push(c.references);
    });
    if (
      referencedColumns.every(
        (c) =>
          c.is_pkey ||
          (!c.references &&
            table.info.uniqueColumnGroups?.some((cg) => cg.includes(c.name))),
      )
    ) {
      return table;
    }
  }
  for (const ref1 of nextReferences) {
    for (const ref2 of ref1 ?? []) {
      const result = getRootTable([ref2], tables, [
        ...prevTables,
        ...ref2.ftable,
      ]);
      if (result) {
        return result;
      }
    }
  }
};
