import { usePromise } from "prostgles-client/dist/react-hooks";
import { useMemo, useRef, useState } from "react";
import { getSmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import { isDefined } from "../../../utils";
import { getJoinFilter } from "./getJoinFilter";
import type { JoinedRecordSection, JoinedRecordsProps } from "./JoinedRecords";

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
  } = props;
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  const parentFormTableNames = useMemo(
    () => getAllParentTableNames(parentForm),
    [parentForm],
  );

  const currentSections = useRef<JoinedRecordSection[]>([]);
  const isInsert = !rowFilter;

  const { diplayedTables, descendants, nestedInsertData } = useMemo(() => {
    const tableJoins =
      tables
        .find((t) => t.name === tableName)
        ?.joins.filter((j) => j.hasFkeys || !showOnlyFKeyTables) ?? [];
    let diplayedTables = tableJoins.slice(0, 0).map((d) => ({
      ...d,
      path: undefined as string[] | undefined,
    }));
    tableJoins.forEach((j) => {
      const jtable = tables.find((t) => t.name === j.tableName);
      if (!jtable) return;

      const joinCols = j.on.flatMap((j) => j[1]);

      /** Is only used for joining and has no other data */
      const nextJoiningTables = jtable.joins.filter((nextJoin) => {
        const nextJoinCols = nextJoin.on.flatMap((j) => j[0]);
        const isNotAlreadyAjoinOrThisTable = !(
          nextJoin.tableName === tableName
        );
        const allColumnsAreJoinColumns =
          Array.from(new Set([...nextJoinCols, ...joinCols])).length ===
          jtable.columns.length;
        return isNotAlreadyAjoinOrThisTable && allColumnsAreJoinColumns;
      });

      nextJoiningTables.forEach((nextTable) => {
        diplayedTables.unshift({
          ...j,
          tableName: nextTable.tableName,
          path: [j.tableName, nextTable.tableName],
        });
      });

      /** Only joins to this table */
      const isLookupTable =
        !nextJoiningTables.length &&
        jtable.columns.every((c) => j.on.some((o) => o[1] === c.name));
      if (isLookupTable) {
        if (showLookupTables) diplayedTables.push({ ...j, path: undefined });
      } else {
        diplayedTables.unshift({ ...j, path: undefined });
      }
    });
    diplayedTables = diplayedTables.filter(
      (t) => !parentFormTableNames.includes(t.tableName),
    );

    const descendants = tables.filter((t) =>
      t.columns.some((c) => c.references?.some((r) => r.ftable === tableName)),
    );
    const rowData = newRowData;
    // parentForm?.type === "insert" && parentForm.columnData ?
    //   parentForm.columnData.value
    // : newRowData;
    const nestedInsertData = Object.fromEntries(
      Object.entries(rowData ?? {})
        .map(([k, d]) => (d.type === "nested-table" ? [k, d.value] : undefined))
        .filter(isDefined),
    );

    return { diplayedTables, descendants, nestedInsertData };
  }, [
    tables,
    tableName,
    showLookupTables,
    showOnlyFKeyTables,
    newRowData,
    parentFormTableNames,
  ]);

  const sections = usePromise(async () => {
    setIsLoadingSections(true);
    const allSections = await Promise.all(
      diplayedTables.map(async (j) => {
        const canInsert = db[j.tableName]?.insert && j.hasFkeys;
        if (action === "insert" && !canInsert) return;
        const path = j.path ?? [j.tableName];
        const detailedJoinFilter = getJoinFilter(path, tableName, rowFilter);
        const joinFilter = getSmartGroupFilter(detailedJoinFilter);
        let countStr = "0";
        let error: string | undefined;
        try {
          if (!isInsert) {
            countStr =
              (await db[j.tableName]?.count?.(joinFilter))?.toString() ?? "0";
          }
        } catch (err) {
          error = `Failed to db.${j.tableName}.count(${JSON.stringify(joinFilter)})`;
          console.error(error);
        }
        const existingDataCount = isInsert ? 0 : parseInt(countStr);

        const count =
          (isInsert ?
            nestedInsertData?.[j.tableName]?.length
          : existingDataCount) ?? 0;

        const res: JoinedRecordSection = {
          label: j.tableName,
          tableName: j.tableName,
          existingDataCount,
          canInsert,
          path,
          error,
          joinFilter,
          detailedJoinFilter,
          count,
          expanded: currentSections.current.find(
            (s) => s.tableName === j.tableName,
          )?.expanded,
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
  ]);

  currentSections.current = sections ?? [];
  return {
    sections,
    isInsert,
    descendants,
    isLoadingSections,
  };
};
