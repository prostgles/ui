import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getEntries } from "@common/utils";
import { assertIconExists } from "@src/utils/assertIconExists";
import type { TableHooks } from "prostgles-server";

export const connectionsTableHooks: TableHooks<DBGeneratedSchema> = {
  connections: {
    afterEach: [
      {
        commands: { insert: 1, update: 1 },
        changedFields: ["table_options"],
        validate: async (args) => {
          const { row } = args;
          /** Ensure icons exist */
          for (const [tableName, tableOption] of getEntries(
            row.table_options ?? {},
          )) {
            if (tableOption?.icon) {
              assertIconExists({
                errorContext: `Table "${tableName}" in connections config has an icon that does not exist`,
                iconName: tableOption.icon,
              });
            }
            for (const [columnName, columnOption] of getEntries(
              tableOption?.columns ?? {},
            )) {
              if (columnOption?.icon) {
                assertIconExists({
                  errorContext: `Column "${columnName}" in table "${tableName}" in connections config has an icon that does not exist`,
                  iconName: columnOption.icon,
                });
              }
            }
          }
          await Promise.resolve();
        },
      },
    ],
  },
};
