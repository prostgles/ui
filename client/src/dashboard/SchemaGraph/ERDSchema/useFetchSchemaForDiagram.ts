import { fetchNamedSVG } from "@components/SvgIcon";
import { usePromise } from "prostgles-client";
import { isDefined, isEmpty } from "prostgles-types";
import { getCssVariableValue } from "../../Charts/TimeChart/getCssVariableValue";
import {
  PG_OBJECT_QUERIES,
  type PGConstraint,
} from "../../SQLEditor/SQLCompletion/getPGObjects";
import { COLOR_PALETTE } from "../../W_Table/ColumnMenu/ColorPicker";
import type { ERDSchemaProps } from "./ERDSchema";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

export const useFetchSchemaForDiagram = (
  props: ERDSchemaProps & {
    canvasRef: React.RefObject<HTMLCanvasElement>;
  },
) => {
  const { columnColorMode, columnDisplayMode, displayMode } = props;
  const { connectionId, dbs, sql, tables: dbTables } = usePrgl();
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
    const tables = dbTables;
    type FkeyConstraint = Pick<
      PGConstraint,
      | "table_oid"
      | "ftable_oid"
      | "conkey"
      | "confkey"
      | "on_delete_action"
      | "on_update_action"
    >;
    const fkeys: FkeyConstraint[] =
      /** TODO: add on_delete/update actions to TableSchema  */
      !sql ?
        (() => {
          const constraintsFromTables: FkeyConstraint[] = [];
          const constraintMap = new Set<string>();
          const upsertConstraint = (constraint: FkeyConstraint) => {
            const { table_oid, ftable_oid, conkey, confkey } = constraint;
            const key = [
              table_oid,
              ftable_oid,
              ...conkey!.sort(),
              ...confkey!.sort(),
            ].join("-");
            if (constraintMap.has(key)) return;
            constraintMap.add(key);
            constraintsFromTables.push(constraint);
          };

          tables.forEach(({ oid, columns }) => {
            columns.forEach((col) => {
              const refs = col.references;
              if (refs?.length) {
                refs.forEach(({ ftable, fcols, cols }) => {
                  const fTable = tables.find((t) => t.name === ftable);
                  if (!fTable) {
                    console.warn(
                      `Referenced table ${ftable} not found for column ${col.name}`,
                    );
                    return;
                  }
                  upsertConstraint({
                    table_oid: oid,
                    ftable_oid: fTable.oid,
                    conkey: columns
                      .map((c) =>
                        cols.includes(c.name) ? c.ordinal_position : undefined,
                      )
                      .filter(isDefined),
                    confkey: fTable.columns
                      .map((c) =>
                        fcols.includes(c.name) ? c.ordinal_position : undefined,
                      )
                      .filter(isDefined),
                    on_delete_action: "NO ACTION",
                    on_update_action: "NO ACTION",
                  });
                });
              }
            });
          });
          return constraintsFromTables;
        })()
      : (
          (await sql(
            PG_OBJECT_QUERIES.constraints.sql,
            {},
            { returnType: "rows" },
          )) as (typeof PG_OBJECT_QUERIES.constraints.type)[]
        ).filter((c) => c.contype === "f");
    const defaultIconColor = getCssVariableValue("--text-2");
    const columnConstraintIcons = {
      pkey: await fetchSVGImage("Key", defaultIconColor),
      fkey: await fetchSVGImage("KeyLink", defaultIconColor),
      unique: await fetchSVGImage("AlphaU", defaultIconColor),
      nullable: await fetchSVGImage("AlphaN", defaultIconColor),
    };

    const getRefs = (oid: number, relType: "references" | "referencedBy") => {
      return fkeys
        .filter(
          ({ table_oid, ftable_oid }) =>
            (relType === "referencedBy" ? ftable_oid : table_oid) === oid,
        )
        .map((c) => (relType === "referencedBy" ? c.table_oid : c.ftable_oid));
    };

    const allTableMostReferencedTop = tables
      .map((t) => ({
        ...t,
        references: getRefs(t.oid, "references"),
        referencedBy: getRefs(t.oid, "referencedBy"),
      }))
      .map((t, i, tablesWithRefs) => ({
        ...t,
        referenceType:
          t.references.length ? ("linked" as const)
          : t.referencedBy.length ? ("root" as const)
          : ("orphan" as const),
        nextReferencedBy: tablesWithRefs
          .filter((lt) => t.referencedBy.includes(lt.oid))
          .flatMap((lt) => lt.referencedBy),
      }))
      .sort((a, b) => {
        const mostReferenced = b.referencedBy.length - a.referencedBy.length;
        return mostReferenced;
      });

    const colors = COLOR_PALETTE.slice(0);
    const schemaColorMap = new Map<string, string>();
    const upsertSchemaColorMap = (schema: string) => {
      if (schemaColorMap.has(schema)) return schemaColorMap.get(schema)!;
      const color = colors.shift() ?? getCssVariableValue("--text-2");
      schemaColorMap.set(schema, color);
      return color;
    };
    const allTablesWithRootColor = allTableMostReferencedTop.map((t) => ({
      ...t,
      /** Root color assigned to top most referenced tables  */
      rootColor:
        columnColorMode === "schema" ?
          upsertSchemaColorMap(t.qualifiedNameParts.schema)
        : t.references.length || t.referencedBy.length ? colors.shift()
        : undefined,
    }));
    const allTables = await Promise.all(
      allTablesWithRootColor.map(async (t) => {
        return {
          ...t,
          iconImage:
            !t.icon ? undefined : (
              await fetchSVGImage(
                t.icon,
                columnColorMode === "root" || columnColorMode === "schema" ?
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
    const getNextTables = (prevColTableOid: number) => {
      const result = topLinkedTables.slice(0, 0);
      const indexesToRemove: number[] = [];
      topLinkedTables.forEach((t, i) => {
        if (!t.references.includes(prevColTableOid)) return;
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
      const nextTables = prevColTables.flatMap((t) => getNextTables(t.oid));
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
      schemaColorMap,
    };
  }, [columnColorMode, dbConf, dbTables, sql]);

  return { schemaInfo, dbConfId: dbConf?.id, dbConf };
};

const fetchSVGImage = (iconName: string, currentFillColor: string) => {
  return fetchNamedSVG(iconName).then((rawSvgString) => {
    if (!rawSvgString) return;
    const svgString = rawSvgString.replaceAll("currentcolor", currentFillColor);
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
