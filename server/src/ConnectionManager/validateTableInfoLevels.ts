import type { DBSSchema } from "@common/publishUtils";

export const validateTableInfoLevels = (
  tableOptions: DBSSchema["connections"]["table_options"] | undefined,
) => {
  for (const [tableName, options] of Object.entries(tableOptions ?? {})) {
    const summaryColumns = Object.values(options?.columns ?? {}).filter(
      (column) => column?.infoLevel === 1,
    );
    if (summaryColumns.length > 10) {
      throw new Error(
        `table_options.${tableName}.columns: at most 10 columns may explicitly use infoLevel: 1. Use infoLevel: 2 for secondary fields.`,
      );
    }
  }
};
