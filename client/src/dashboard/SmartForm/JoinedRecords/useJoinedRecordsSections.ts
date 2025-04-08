import type {
  TableHandlerClient,
  ViewHandlerClient,
} from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { useMemo, useRef, useState } from "react";
import { getSmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import { isDefined } from "../../../utils";
import { getJoinFilter } from "./getJoinFilter";
import type { JoinedRecordSection, JoinedRecordsProps } from "./JoinedRecords";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";

const getAllParentTableNames = (
  parentForm: JoinedRecordsProps["parentForm"],
): string[] => {
  if (!parentForm?.table) return [];
  return [
    parentForm.table.name,
    ...getAllParentTableNames(parentForm.parentForm),
  ];
};

export const useJoinedRecordsSections = (props: JoinedRecordsProps) => {
  const {
    tables,
    db,
    tableName,
    showLookupTables = true,
    showOnlyFKeyTables,
    modeType: action,
    showRelated,
    newRowData,
    rowFilter,
    parentForm,
    errors,
  } = props;
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  const tablesMap = useMemo(() => {
    const map = new Map<string, DBSchemaTableWJoins>();
    tables.forEach((t) => {
      map.set(t.name, t);
    });
    return map;
  }, [tables]);

  const parentFormTableNames = useMemo(
    () => getAllParentTableNames(parentForm),
    [parentForm],
  );

  const table = useMemo(() => tablesMap.get(tableName), [tablesMap, tableName]);

  const currentSections = useRef<JoinedRecordSection[]>([]);
  const isInsert = !rowFilter;

  const { diplayedTables, descendants } = useMemo(() => {
    const tableJoins =
      table?.joins.filter((j) => j.hasFkeys || !showOnlyFKeyTables) ?? [];
    // let diplayedTables = tableJoins.slice(0, 0).map((d) => ({
    //   ...d,
    //   path: undefined as string[] | undefined,
    // }));
    // tableJoins.forEach((j) => {
    //   const jtable = tables.find((t) => t.name === j.tableName);
    //   if (!jtable) return;

    //   const joinCols = j.on.flatMap((j) => j[1]);

    //   /** Is only used for joining and has no other data */
    //   const nextJoiningTables = jtable.joins.filter((nextJoin) => {
    //     const nextJoinCols = nextJoin.on.flatMap((j) => j[0]);
    //     const isNotAlreadyAjoinOrThisTable = !(
    //       nextJoin.tableName === tableName
    //     );
    //     const allColumnsAreJoinColumns =
    //       Array.from(new Set([...nextJoinCols, ...joinCols])).length ===
    //       jtable.columns.length;
    //     return isNotAlreadyAjoinOrThisTable && allColumnsAreJoinColumns;
    //   });

    //   nextJoiningTables.forEach((nextTable) => {
    //     diplayedTables.unshift({
    //       ...j,
    //       tableName: nextTable.tableName,
    //       path: [j.tableName, nextTable.tableName],
    //     });
    //   });

    //   /** Only joins to this table */
    //   const isLookupTable =
    //     !nextJoiningTables.length &&
    //     jtable.columns.every((c) => j.on.some((o) => o[1] === c.name));
    //   if (isLookupTable) {
    //     if (showLookupTables) diplayedTables.push({ ...j, path: undefined });
    //   } else {
    //     diplayedTables.unshift({ ...j, path: undefined });
    //   }
    // });
    const diplayedTables = tableJoins
      .map((j) => ({
        ...j,
        // path: undefined,
      }))
      .filter((t) => !parentFormTableNames.includes(t.tableName));

    const descendants = tables.filter((t) =>
      t.columns.some((c) => c.references?.some((r) => r.ftable === tableName)),
    );

    return { diplayedTables, descendants };
  }, [
    tables,
    tableName,
    showLookupTables,
    showOnlyFKeyTables,
    parentFormTableNames,
    table?.joins,
  ]);

  const nestedInsertData = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(newRowData ?? {})
          .map(([k, d]) =>
            d.type === "nested-table" ? [k, d.value] : undefined,
          )
          .filter(isDefined),
      ),
    [newRowData],
  );

  const sections = usePromise(async () => {
    setIsLoadingSections(true);
    const allSections = await Promise.all(
      diplayedTables.map(async (j) => {
        const canInsert = db[j.tableName]?.insert && j.hasFkeys;
        if (action === "insert" && !canInsert) return;
        const path = [j.tableName]; // j.path ??
        const detailedJoinFilter = getJoinFilter(path, tableName, rowFilter);
        const joinFilter = getSmartGroupFilter(detailedJoinFilter);
        let countStr = "0";
        let countError: string | undefined;
        const tableHandler = db[j.tableName] as
          | undefined
          | Partial<TableHandlerClient | ViewHandlerClient>;
        try {
          if (!isInsert) {
            countStr =
              (await tableHandler?.count?.(joinFilter))?.toString() ?? "0";
          }
        } catch (err) {
          countError = `Failed to db.${j.tableName}.count(${JSON.stringify(joinFilter)})`;
          console.error(countError);
        }
        const existingDataCount = isInsert ? 0 : parseInt(countStr);

        const count =
          (isInsert ?
            nestedInsertData?.[j.tableName]?.length
          : existingDataCount) ?? 0;

        const table = tablesMap.get(j.tableName);
        if (!table) return;

        const res: JoinedRecordSection = {
          label: table.label,
          tableName: j.tableName,
          existingDataCount,
          canInsert,
          path,
          error: errors[j.tableName] || countError,
          joinFilter,
          detailedJoinFilter,
          count,
          expanded: currentSections.current.find(
            (s) => s.tableName === j.tableName,
          )?.expanded,
          table,
          tableHandler,
        };

        return res;
      }),
    );

    const sections = allSections
      .filter(isDefined)
      .filter(
        (s) => !showRelated || descendants.some((t) => t.name === s.tableName),
      );
    setIsLoadingSections(false);
    return sections;
  }, [
    diplayedTables,
    action,
    db,
    rowFilter,
    tableName,
    isInsert,
    nestedInsertData,
    descendants,
    showRelated,
    errors,
    tablesMap,
  ]);

  currentSections.current = sections ?? [];
  return {
    sections,
    isInsert,
    descendants,
    isLoadingSections,
  };
};
