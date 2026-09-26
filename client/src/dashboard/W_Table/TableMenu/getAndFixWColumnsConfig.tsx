import { quickClone } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import { isDefined } from "../../../utils/utils";
import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import type { ColumnConfig, NestedColumn } from "../ColumnMenu/ColumnConfig";

export const getAndFixWColumnsConfig = async (
  tables: DBSchemaTableWithRenderInfo[],
  w: WindowSyncItem<"table">,
): Promise<ColumnConfig[]> => {
  const table = tables.find((t) => t.name === w.table_name);
  if (!table) return [];
  const defaultSort = !w.columns && !w.sort?.length ? table.sort : undefined;
  const { columns: rootColumns, update: updateRoot } = getUpdatedColumnsConfig(
    table,
    w.columns ?? null,
  );
  let update = updateRoot;
  const columns: ColumnConfig[] = rootColumns
    .map((c) => {
      if (c.nested) {
        const nestedTable = tables.find(
          (t) => t.name === c.nested?.path.at(-1)?.table,
        );

        /** Table was dropped */
        if (!nestedTable) return undefined;

        const nestedColumns = getUpdatedColumnsConfig(
          nestedTable,
          c.nested.columns,
        );
        update = update || nestedColumns.update;
        return {
          ...c,
          nested: {
            ...c.nested,
            columns: nestedColumns.columns,
          },
        };
      }
      return c;
    })
    .filter(isDefined);
  if (update || defaultSort?.length) {
    await w.$update({
      columns,
      ...(defaultSort?.length ? { sort: defaultSort } : {}),
    });
  }
  return columns;
};

const getUpdatedColumnsConfig = <
  C extends ColumnConfig | NestedColumn<ColumnConfig> = ColumnConfig,
>(
  table: DBSchemaTableWithRenderInfo,
  existingCols: C[] | null,
): {
  columns: C[];
  update: boolean;
} => {
  try {
    const tableColumnsConfig = table.columns.map(
      (c) =>
        ({
          name: c.name,
          show: true,
          computed: false,
          format: c.renderAs,
          style: c.style,
        }) as ColumnConfig | NestedColumn<ColumnConfig> as C,
    );

    if (existingCols) {
      const columnsHaveNotChanged =
        Array.from(
          new Set(
            existingCols
              .map((c) => c.computedConfig?.column ?? c.name)
              .filter(isDefined),
          ),
        )
          .toSorted()
          .join() ===
        tableColumnsConfig
          .map((c) => c.name)
          .toSorted()
          .join();
      if (columnsHaveNotChanged) {
        return {
          columns: existingCols,
          update: false,
        };
      }

      /* Remove missing columns */
      const validWCols = quickClone(existingCols).filter(
        ({ name, nested, computedConfig }) => {
          return tableColumnsConfig.find((c1) => {
            if (nested) {
              return true;
            }
            if (computedConfig) {
              return (
                !computedConfig.column || computedConfig.column === c1.name
              );
            }
            return name === c1.name;
          });
        },
      );

      /* Add missing columns */
      const newlyCreatedTableCols = tableColumnsConfig
        .filter((c1) => !validWCols.find((nc) => nc.name === c1.name))
        .map((c) => ({ name: c.name, show: true }));

      return {
        columns: [...validWCols, ...newlyCreatedTableCols] as C[],
        update: true,
      };
    }

    return {
      columns: tableColumnsConfig,
      update: true,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
};
