import type {
  ColumnConfig,
  ColumnConfigWithInfo,
} from "@common/ColumnConfig/ColumnConfig";
import type { DBSchemaTableWithRenderInfo } from "../../Dashboard/getTables";
import { getReferenceColumn } from "./getReferenceColumn";

/** Expand table defaults before columns are enriched, queried or rendered. */
export const resolveTableColumns = (
  table: DBSchemaTableWithRenderInfo,
  tables: DBSchemaTableWithRenderInfo[],
  configuredColumns: ColumnConfig[],
  inheritDefaults = true,
): (ColumnConfig & Pick<ColumnConfigWithInfo, "defaultConfig">)[] => {
  const defaults = new Map<string, ColumnConfig>();
  const columnOptions = inheritDefaults ? table.columnConfigs : undefined;
  Object.entries(columnOptions ?? {}).forEach(([name, options]) => {
    const isPhysicalColumn = table.columns.some(
      (column) => column.name === name,
    );
    const { nested, ...config } = options;
    const availableNested = nested && getAvailableNested(nested, table, tables);
    if (!isPhysicalColumn && nested && !availableNested) return;
    defaults.set(name, {
      ...config,
      name,
      ...(!isPhysicalColumn && { nested: availableNested }),
    });
  });
  const columns: ColumnConfig[] = [
    ...configuredColumns,
    ...Array.from(
      new Set([...table.columns.map(({ name }) => name), ...defaults.keys()]),
    )
      .filter(
        (name) => !configuredColumns.some((column) => column.name === name),
      )
      .map((name) => ({
        name,
        ...(!inheritDefaults && { show: false }),
      })),
  ].map((column) => ({
    show:
      !inheritDefaults ||
      !table.defaultColumns ||
      table.defaultColumns.includes(column.name),
    ...defaults.get(column.name),
    ...column,
  }));
  const reservedNames = new Set([
    ...table.columns.map(({ name }) => name),
    ...defaults.keys(),
  ]);
  table.columns.forEach(({ defaultRenderAs }) => {
    if (defaultRenderAs && "dataKey" in defaultRenderAs.params) {
      reservedNames.add(defaultRenderAs.params.dataKey);
    }
  });
  const expandedColumns = columns.flatMap((column) => {
    const info = table.columns.find(({ name }) => name === column.name);
    if (!info?.select) return [column];
    const baseName = `__managed_${column.name}`;
    let name = baseName;
    let suffix = 1;
    while (reservedNames.has(name)) name = `${baseName}_${suffix++}`;
    const defaultNested = columnOptions?.[column.name]?.nested;
    const nested =
      defaultNested &&
      !column.nested &&
      !column.computedConfig &&
      !column.format &&
      getAvailableNested(defaultNested, table, tables);
    const referenceColumn =
      nested ?
        {
          ...column,
          name,
          label: column.label ?? info.label,
          nested,
        }
      : getReferenceColumn(
          { ...column, format: column.format ?? info.renderAs, info },
          tables,
          name,
        );
    const configuredReference = configuredColumns.find(
      (column) => column.name === name,
    );
    if (!referenceColumn) {
      // Restore the source when its inherited display is no longer available.
      return configuredReference?.show && !configuredReference.nested ?
          [{ ...column, show: true }]
        : [column];
    }
    reservedNames.add(name);
    defaults.set(name, referenceColumn);
    if (configuredReference) return [column];
    return [{ ...column, show: false }, referenceColumn];
  });
  return expandedColumns.map((column) => {
    const defaultConfig = defaults.get(column.name);
    return defaultConfig ?
        { ...defaultConfig, ...column, defaultConfig }
      : column;
  });
};

const getAvailableNested = (
  nested: NonNullable<ColumnConfig["nested"]>,
  sourceTable: DBSchemaTableWithRenderInfo,
  tables: DBSchemaTableWithRenderInfo[],
) => {
  let source = sourceTable;
  for (const path of nested.path) {
    const target = tables.find((table) => table.name === path.table);
    if (
      !target ||
      !source.joinOptions.some(
        (join) =>
          join.table === path.table &&
          (typeof path.on !== "string" || join.on === path.on),
      )
    )
      return;
    source = target;
  }
  const columns = nested.columns.filter(
    (column) =>
      column.computedConfig ||
      column.format?.type === "Action" ||
      column.format?.type === "ActionColumns" ||
      source.columns.some(({ name, select }) => name === column.name && select),
  );
  if (!columns.some((column) => column.show !== false)) return;
  return { ...nested, columns };
};
