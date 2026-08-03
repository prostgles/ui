import {
  getSmartGroupFilter,
  isJoinedFilter,
  type DetailedFilter,
} from "@common/filterUtils";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { getSerialisableError, type AnyObject } from "prostgles-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDefined } from "../../../utils/utils";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { getJoinFilter } from "./getJoinFilter";
import type { JoinedRecordsProps } from "./JoinedRecords";

const getAllParentTableNames = (
  parentForm: JoinedRecordsProps["parentForm"],
): string[] => {
  if (!parentForm?.table) return [];
  return [
    parentForm.table.name,
    ...getAllParentTableNames(parentForm.parentForm),
  ];
};

export type JoinedRecordSection = {
  label: string;
  tableName: string;
  path: string[];
  expanded?: boolean;
  existingDataCount: number;
  canInsert?: boolean;
  error?: unknown;
  joinFilter: AnyObject;
  detailedJoinFilter: DetailedFilter[];
  count: number;
  table: DBSchemaTableWJoins;
  tableHandler: Partial<TableHandlerClient> | undefined;
};
export const useJoinedRecordsSections = (props: JoinedRecordsProps) => {
  const {
    tables,
    db,
    tableName,
    modeType: action,
    showRelated,
    newRowData,
    rowFilter,
    parentForm,
    errors,
    tablesToShow,
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
    const tableJoins = table?.joins.filter((j) => j.hasFkeys) ?? [];
    const diplayedTables = tableJoins.filter(
      (t) =>
        (!tablesToShow || t.tableName in tablesToShow) &&
        !parentFormTableNames.includes(t.tableName),
    );

    const descendants = tables.filter((t) =>
      t.columns.some((c) => c.references?.some((r) => r.ftable === tableName)),
    );

    return { diplayedTables, descendants };
  }, [tables, tableName, parentFormTableNames, table?.joins, tablesToShow]);

  const nestedInsertData = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(newRowData ?? {})
          .map(([k, d]) =>
            d.type === "nested-table" ? [k, d.value] : undefined,
          )
          .filter(isDefined),
      ) as Record<string, AnyObject[]>,
    [newRowData],
  );

  const [sectionCounts, setSectionCounts] = useState<
    Map<
      string,
      | { success: true; count: number; existingDataCount: number }
      | { success: false; error: unknown }
    >
  >(new Map());
  const refreshSectionCount = useCallback(
    async ({
      tableHandler,
      joinFilter,
      tableName,
    }: Pick<
      JoinedRecordSection,
      "tableHandler" | "joinFilter" | "tableName"
    >) => {
      let countStr = "0";
      let countError: string | undefined;
      try {
        if (!isInsert) {
          countStr =
            (await tableHandler?.count?.(joinFilter))?.toString() ?? "0";
        }
      } catch (err) {
        countError = `Failed to db.${tableName}.count(${JSON.stringify(joinFilter)}). Error: ${JSON.stringify(getSerialisableError(err))}`;
        console.error(countError);
      }
      const existingDataCount = isInsert ? 0 : parseInt(countStr);
      const count =
        (isInsert ? nestedInsertData[tableName]?.length : existingDataCount) ??
        0;
      setSectionCounts((prev) => {
        const newMap = new Map(prev);
        if (countError) {
          newMap.set(tableName, { success: false, error: countError });
        } else {
          newMap.set(tableName, { success: true, existingDataCount, count });
        }
        return newMap;
      });
    },
    [isInsert, nestedInsertData],
  );
  const sectionsWithoutCounts = useMemo(() => {
    const allSections = diplayedTables.map((j) => {
      const canInsert = db[j.tableName]?.insert && j.hasFkeys;
      if (action === "insert" && !canInsert) return;
      const path = [j.tableName];
      const detailedJoinFilter = getJoinFilter(
        path,
        tableName,
        rowFilter?.filter((f) => !isJoinedFilter(f)),
        {
          minimised: true,
        },
      );
      const joinFilter = getSmartGroupFilter(detailedJoinFilter);
      const tableHandler = db[j.tableName];
      const table = tablesMap.get(j.tableName);
      if (!table) return;

      const res: Omit<JoinedRecordSection, "count" | "existingDataCount"> = {
        label: table.label,
        tableName: j.tableName,
        canInsert,
        path,
        error: errors[j.tableName],
        joinFilter,
        detailedJoinFilter,
        expanded: currentSections.current.find(
          (s) => s.tableName === j.tableName,
        )?.expanded,
        table,
        tableHandler,
      };

      return res;
    });

    const sections = allSections
      .filter(isDefined)
      .filter(
        (s) => !showRelated || descendants.some((t) => t.name === s.tableName),
      );
    return sections;
  }, [
    diplayedTables,
    action,
    db,
    rowFilter,
    tableName,
    descendants,
    showRelated,
    errors,
    tablesMap,
  ]);

  useEffect(() => {
    setIsLoadingSections(true);
    void Promise.all(sectionsWithoutCounts.map(refreshSectionCount)).finally(
      () => {
        setIsLoadingSections(false);
      },
    );
  }, [sectionsWithoutCounts, refreshSectionCount]);

  const sections = useMemo(() => {
    return sectionsWithoutCounts.map((s) => {
      const countData = sectionCounts.get(s.tableName);
      if (!countData) {
        return { ...s, existingDataCount: 0, count: 0 };
      }
      if (!countData.success) {
        return {
          ...s,
          existingDataCount: 0,
          count: 0,
          error: s.error ?? countData.error,
        };
      }
      return {
        ...s,
        existingDataCount: countData.existingDataCount,
        count: countData.count,
      };
    });
  }, [sectionsWithoutCounts, sectionCounts]);

  currentSections.current = sections;
  return {
    sections,
    isInsert,
    descendants,
    isLoadingSections,
    refreshSectionCount,
  };
};
