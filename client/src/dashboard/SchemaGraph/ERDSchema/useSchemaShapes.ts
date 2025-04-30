import { usePromise } from "prostgles-client/dist/react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { isDefined } from "../../../utils";
import type {
  ChartedText,
  LinkLine,
  Rectangle,
} from "../../Charts/CanvasChart";
import { measureText } from "../../Charts/measureText";
import { getCssVariableValue } from "../../Charts/onRenderTimechart";
import type { ShapeV2 } from "../../Charts/drawShapes/drawShapes";
import { PG_OBJECT_QUERIES } from "../../SQLEditor/SQLCompletion/getPGObjects";
import type { SchemaGraphDisplayMode, SchemaGraphProps } from "../SchemaGraph";

export const useSchemaShapes = ({
  tables,
  db,
  dbs,
  connectionId,
  canvasRef,
  displayMode,
}: SchemaGraphProps & {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  displayMode: SchemaGraphDisplayMode;
}) => {
  const shapesRef = useRef<ShapeV2[]>([]);
  const [shapesVersion, setShapesVersion] = useState(0);
  const { data: dbConf } = dbs.database_configs.useFindOne({
    $existsJoined: {
      connections: {
        id: connectionId,
      },
    },
  });

  const tablesWithPositions = useMemo(() => {
    return tables.map((t) => {
      const position = dbConf?.table_schema_positions?.[t.name];
      return {
        ...t,
        position,
      };
    });
  }, [tables, dbConf]);

  const fkeys = usePromise(async () => {
    const constraints =
      !db.sql ?
        []
      : ((await db.sql(
          PG_OBJECT_QUERIES.constraints.sql,
          {},
          { returnType: "rows" },
        )) as (typeof PG_OBJECT_QUERIES.constraints.type)[]);

    return constraints.filter((c) => c.contype === "f");
  });

  const dbConfId = dbConf?.id;
  useEffect(() => {
    if (!fkeys) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const COL_SPACING = 30;
    const PADDING = 10;
    const nodeShapes = tablesWithPositions
      .flatMap((table, i) => {
        const offset = 50 * i;
        const x = table.position?.x ?? offset;
        const y = table.position?.y ?? offset;
        const header: ChartedText = {
          id: table.name + "-header",
          type: "text",
          text: table.label,
          coords: [PADDING, COL_SPACING],
          font: "bold 22px Courier",
          fillStyle: getCssVariableValue("--text-1"),
        };
        const cols: ChartedText[] = table.columns.map((c, i) => {
          const colYOffset = COL_SPACING * (i + 2);
          return {
            id: `${table.name}-${c.name}-col`,
            type: "text",
            coords: [PADDING, colYOffset],
            text: c.name,
            fillStyle: getCssVariableValue("--text-1"),
            font: "16px sans-serif",
          } satisfies ChartedText;
        });

        const widestText = [...cols, header].reduce((acc, v) => {
          return Math.max(acc, measureText(v, ctx, false).width);
        }, 0);

        const box: Rectangle<typeof table> = {
          id: table.name,
          type: "rectangle",
          coords: [x - PADDING, y - COL_SPACING - PADDING],
          w: widestText + 2 * PADDING,
          h: (cols.length + 1) * COL_SPACING + 2 * PADDING,
          fillStyle: getCssVariableValue("--bg-color-0"),
          strokeStyle: "black",
          lineWidth: 1,
          borderRadius: 10,
          children: [header, ...cols],
          data: table,
          // elevation: 10,
        };

        return [box];
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
          console.warn("link not found", fkCons);
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
          // if ([t1.data.name, t2.data.name].includes("user_types")) {
          //   debugger;
          // }
          return {
            id: `${tbl.id}-link-${ftbl.id}`,
            type: "linkline",
            sourceId: ftbl.id,
            targetId: tbl.id,
            sourceYOffset: PADDING + COL_SPACING * (1 + fcolIdx + 0.5),
            targetYOffset: PADDING + COL_SPACING * (1 + colIdx + 0.5),
            lineWidth: 3,
            strokeStyle: getCssVariableValue("--text-2"),
          } satisfies LinkLine;
        });
      })
      .filter(isDefined);

    const shapes = [...linkShapes, ...nodeShapes];
    shapesRef.current = shapes;
    setShapesVersion((v) => v + 1);
  }, [canvasRef, fkeys, tablesWithPositions, displayMode]);

  return {
    shapesRef,
    dbConfId,
    fkeys,
    shapesVersion,
  };
};
