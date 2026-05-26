import type { TableSchema } from "prostgles-server/dist/DboBuilder/DboBuilder";
import type { UserInputItem } from "../runtimeSdk/defineAgenticWorkflow";
import { assertTablesExistInFutureSchema } from "./assertTablesExistInFutureSchema";

export const validateUserInputDefinitions = (
  tablesOrViews: TableSchema[],
  userInput: Record<string, UserInputItem>,
) => {
  Object.entries(userInput).forEach(([inputName, inputDefinition]) => {
    if (
      inputDefinition.type === "table-filter" ||
      inputDefinition.type === "table-column" ||
      inputDefinition.type === "table-column-value" ||
      inputDefinition.type === "table-column-values"
    ) {
      const tableName = inputDefinition.tableName;
      assertTablesExistInFutureSchema(
        tablesOrViews,
        [tableName],
        `Validation error for userInput definition ${inputName}:`,
      );

      if (
        inputDefinition.type === "table-column-value" ||
        inputDefinition.type === "table-column-values"
      ) {
        const table = tablesOrViews.find((tov) => tov.name === tableName)!;
        if (
          !table.columns.some((col) => col.name === inputDefinition.columnName)
        ) {
          throw `Validation error for userInput definition ${inputName}: the column name ${inputDefinition.columnName} does not exist in table ${tableName}`;
        }
      }
    }
  });
};
