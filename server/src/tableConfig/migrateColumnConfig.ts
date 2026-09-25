// Only the legacy fields needed by the database migration.
export type MigratableColumn = {
  show?: boolean;
  style?: unknown;
  action?: { type: "record" | "relatedRecords" };
  computedConfig?: { funcDef: { isAggregate?: boolean } };
  nested?: {
    columns: MigratableColumn[];
    display?: unknown;
    displayMode?: "record" | "row" | "column" | "no-headers";
    chart?: { type: string };
  };
};

/** Convert columns saved before the nested display/action configuration was introduced. */
export const migrateColumnConfig = <C extends MigratableColumn>(column: C): C => {
  const nested = column.nested;
  if (!nested || nested.display) return column;

  const { displayMode, chart, ...query } = nested;
  const entities = displayMode === "record" && nested.columns.some((c) => c.show && !c.computedConfig);
  const shownColumns = nested.columns.filter((c) => c.show);
  return {
    ...column,
    style: entities ? column.style : undefined,
    action: entities ? column.action ?? { type: "record" } : column.action,
    nested: {
      ...query,
      display: chart ? { ...chart, type: "timechart" } : entities ? { type: "entities" } : {
        type: "values",
        labels: displayMode === "no-headers" ? "none" : shownColumns.length === 1 ? "auto" :
          displayMode === "row" ? "inline" : "above",
      },
      columns: nested.columns.map((child) => ({
        ...child,
        style: child.style ?? (!entities && shownColumns.length === 1 ? column.style : undefined),
        action: child.action ?? (child.computedConfig?.funcDef.isAggregate ? { type: "relatedRecords" } : undefined),
      })),
    },
  };
};
