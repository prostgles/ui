// Only the legacy fields needed by the database migration.
export type MigratableColumn = {
  show?: boolean;
  style?: unknown;
  display?: "drillable-records";
  computedConfig?: { funcDef: { isAggregate?: boolean } };
  nested?: {
    columns: MigratableColumn[];
    display?: unknown;
    displayMode?: "record" | "row" | "column" | "no-headers";
    chart?: { type: string };
  };
};

/** Convert columns saved before the nested display configuration was introduced. */
export const migrateColumnConfig = <C extends MigratableColumn>(column: C): C => {
  const nested = column.nested;
  if (!nested || nested.display) return column;

  const { displayMode, chart, ...query } = nested;
  const drillableRecords = displayMode === "record" && nested.columns.some((c) => c.show && !c.computedConfig);
  const shownColumns = nested.columns.filter((c) => c.show);
  return {
    ...column,
    style: drillableRecords ? column.style : undefined,
    nested: {
      ...query,
      display: chart ? { ...chart, type: "timechart" } : drillableRecords ? { type: "drillable-records" } : {
        type: "values",
        labels: displayMode === "no-headers" ? "none" : shownColumns.length === 1 ? "auto" :
          displayMode === "row" ? "inline" : "above",
      },
      columns: nested.columns.map((child) => ({
        ...child,
        style: child.style ?? (!drillableRecords && shownColumns.length === 1 ? column.style : undefined),
        display: child.display ?? (child.computedConfig?.funcDef.isAggregate ? "drillable-records" : undefined),
      })),
    },
  };
};
