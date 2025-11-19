import { usePromise } from "prostgles-client/dist/react-hooks";
import { isEmpty } from "prostgles-types";
import { fetchNamedSVG } from "@components/SvgIcon";
import { getCssVariableValue } from "../../Charts/TimeChart/onRenderTimechart";
import { PG_OBJECT_QUERIES } from "../../SQLEditor/SQLCompletion/getPGObjects";
import { COLOR_PALETTE } from "../../W_Table/ColumnMenu/ColorPicker";
import type { ERDSchemaProps } from "./ERDSchema";

export const useFetchSchemaForDiagram = (
  props: ERDSchemaProps & {
    canvasRef: React.RefObject<HTMLCanvasElement>;
  },
) => {
  const {
    db,
    dbs,
    connectionId,
    tables: dbTables,
    columnColorMode,
    columnDisplayMode,
    displayMode,
  } = props;
  const { data: dbConf } = dbs.database_configs.useFindOne(
    {
      $existsJoined: {
        connections: {
          id: connectionId,
        },
      },
    },
    {},
    { deps: [columnDisplayMode, displayMode, columnColorMode] },
  );

  const schemaInfo = usePromise(async () => {
    if (!dbConf) return;
    const { sql } = db;
    const constraints =
      !sql ?
        []
      : ((await sql(
          PG_OBJECT_QUERIES.constraints.sql,
          {},
          { returnType: "rows" },
        )) as (typeof PG_OBJECT_QUERIES.constraints.type)[]);
    const tables = dbTables;
    const defaultIconColor = getCssVariableValue("--text-2");
    const columnConstraintIcons = {
      pkey: await fetchSVGImage("Key", defaultIconColor),
      fkey: await fetchSVGImage("KeyLink", defaultIconColor),
      unqiue: await fetchSVGImage("AlphaU", defaultIconColor),
      nullable: await fetchSVGImage("AlphaN", defaultIconColor),
    };

    const fkeys = constraints.filter((c) => c.contype === "f");
    const getRefs = (
      tableName: string,
      relType: "references" | "referencedBy",
    ) => {
      return fkeys
        .filter(
          ({ table_name, ftable_name }) =>
            (relType === "referencedBy" ? ftable_name : table_name) ===
            tableName,
        )
        .map((c) =>
          relType === "referencedBy" ? c.table_name! : c.ftable_name!,
        );
    };

    const allTableMostReferencedTop = tables
      .map((t) => ({
        ...t,
        references: getRefs(t.name, "references"),
        referencedBy: getRefs(t.name, "referencedBy"),
      }))
      .map((t, i, tablesWithRefs) => ({
        ...t,
        referenceType:
          t.references.length ? ("linked" as const)
          : t.referencedBy.length ? ("root" as const)
          : ("orphan" as const),
        nextReferencedBy: tablesWithRefs
          .filter((lt) => t.referencedBy.includes(lt.name))
          .flatMap((lt) => lt.referencedBy),
      }))
      .sort((a, b) => {
        const mostReferenced = b.referencedBy.length - a.referencedBy.length;
        return mostReferenced;
      });

    const colors = COLOR_PALETTE.slice(0);
    const allTablesWithRootColor = allTableMostReferencedTop.map((t) => ({
      ...t,
      /** Root color assigned to top most referenced tables  */
      rootColor: colors.shift(),
    }));

    const allTables = await Promise.all(
      allTablesWithRootColor.map(async (t) => {
        return {
          ...t,
          iconImage:
            !t.icon ? undefined : (
              await fetchSVGImage(
                t.icon,
                columnColorMode === "root" ?
                  (t.rootColor ?? defaultIconColor)
                : defaultIconColor,
              )
            ),
        };
      }),
    );

    const topRootTables = allTables
      .filter((t) => t.referenceType === "root")
      .sort((a, b) => {
        const mostReferenced =
          b.nextReferencedBy.length - a.nextReferencedBy.length;
        return mostReferenced;
      });
    const topLinkedTables = allTables
      .filter((t) => t.referenceType === "linked")
      .sort((a, b) => {
        const mostReferenced =
          b.nextReferencedBy.length +
          b.referencedBy.length -
          (a.nextReferencedBy.length + a.referencedBy.length);
        return mostReferenced;
      });
    const getNextTables = (prevColTableName: string) => {
      const result = topLinkedTables.slice(0, 0);
      const indexesToRemove: number[] = [];
      topLinkedTables.forEach((t, i) => {
        if (!t.references.includes(prevColTableName)) return;
        // if (result.length >= limit) return;
        result.push(t);
        indexesToRemove.push(i);
      });
      indexesToRemove.reverse().forEach((i) => {
        topLinkedTables.splice(i, 1);
      });
      return result;
    };
    const schemaColumns = [topRootTables];
    while (topLinkedTables.length) {
      const prevColTables = schemaColumns.at(-1);
      if (!prevColTables) break;
      const nextTables = prevColTables.flatMap((t) => getNextTables(t.name));
      schemaColumns.push(nextTables);
    }

    schemaColumns.push(allTables.filter((t) => t.referenceType === "orphan"));

    const INITIAL_CHART_MAX_HEIGHT = 3000;
    let tablePositions = dbConf.table_schema_positions ?? {};

    if (isEmpty(tablePositions)) {
      let x = 0;
      let y = 0;
      /**
       * Place in columns. If the column is too tall, move to next column.
       */
      schemaColumns.forEach((colTables) => {
        y = 0;
        const colTablePositions = colTables.reduce((acc, t) => {
          y += 300;
          if (y > INITIAL_CHART_MAX_HEIGHT) {
            y = 0;
            x += 300;
          }
          return {
            ...acc,
            [t.name]: { x, y },
          };
        }, {});
        x += 300;
        tablePositions = {
          ...tablePositions,
          ...colTablePositions,
        };
      });
    }

    const tablesWithPositions = allTables.map((t) => ({
      ...t,
      position: tablePositions[t.name],
    }));

    return {
      tablesWithPositions,
      fkeys,
      columnConstraintIcons,
    };
  }, [columnColorMode, db, dbConf, dbTables]);

  return { schemaInfo, dbConfId: dbConf?.id, dbConf };
};

const fetchSVGImage = (iconName: string, currentcolor: string) => {
  return fetchNamedSVG(iconName).then((rawSvgString) => {
    if (!rawSvgString) return;
    const svgString = rawSvgString.replaceAll("currentcolor", currentcolor);
    return new Promise<HTMLImageElement>((resolve) => {
      // Create a data URL
      const img = new Image();
      img.src =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

      img.onload = function () {
        resolve(img);
      };
    });
  });
};
