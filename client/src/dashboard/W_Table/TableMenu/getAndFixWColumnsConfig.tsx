import { quickClone } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type {
  DBSchemaTablesWJoins,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import type { ColumnConfig } from "../ColumnMenu/ColumnMenu";
import { isDefined } from "../../../utils";

const getUpdatedColumnsConfig = (
  table: DBSchemaTablesWJoins[number],
  existingCols: ColumnConfig[] | null,
) => {
  try {
    const tableColumnsConfig: ColumnConfig[] = table.columns.map((c) => ({
      name: c.name,
      show: true,
      computed: false,
    }));

    if (existingCols && Array.isArray(existingCols)) {
      const columnsHaveChanged =
        existingCols
          .map((c) => c.name)
          .sort()
          .join() !==
        tableColumnsConfig
          .map((c) => c.name)
          .sort()
          .join();
      if (columnsHaveChanged) {
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
          columns: validWCols.concat(newlyCreatedTableCols),
          update: true,
        };
      }

      return {
        columns: existingCols,
        update: false,
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

export const getAndFixWColumnsConfig = async (
  tables: DBSchemaTablesWJoins,
  w: WindowSyncItem<"table">,
): Promise<ColumnConfig[]> => {
  const table = tables.find((t) => t.name === w.table_name);
  if (!table) return [];
  const { columns: rootColumns, update: updateRoot } = getUpdatedColumnsConfig(
    table,
    w.columns,
  );
  let update = updateRoot;
  const columns = rootColumns
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
  if (update) {
    await w.$update!({ columns });
  }
  return columns;
};
