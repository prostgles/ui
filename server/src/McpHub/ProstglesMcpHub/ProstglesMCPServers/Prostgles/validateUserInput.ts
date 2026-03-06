import { getProperty } from "@common/utils";
import type { AgenticWorkflowDefinition } from "./defineAgenticWorkflowHandlers";

export const validateUserInput = (
  userInputValue: Record<string, unknown>,
  userInputDefinition: AgenticWorkflowDefinition["userInput"],
) => {
  if (!userInputDefinition) return;
  for (const [key, definition] of Object.entries(userInputDefinition)) {
    const titleOrKey = definition.title || key;
    const value = userInputValue[key];
    if (definition.optional && value === undefined) continue;
    if (!definition.optional && value === undefined) {
      return {
        error: `Missing required user input: ${JSON.stringify(titleOrKey)}`,
      };
    }
    if (definition.type === "table-filter") {
      if (!value) {
        return {
          error: `Missing value for user input ${JSON.stringify(titleOrKey)}`,
        };
      }
    } else if (definition.type === "table-and-column") {
      if (
        !value ||
        typeof getProperty(value, "tableName") !== "string" ||
        typeof getProperty(value, "columnName") !== "string"
      ) {
        return {
          error: `Invalid or missing tableName for user input ${JSON.stringify(
            titleOrKey,
          )}`,
        };
      }
    } else if (definition.type === "enum") {
      if (typeof value !== "string") {
        return {
          error: `Invalid type for user input ${JSON.stringify(titleOrKey)}: expected string for enum`,
        };
      }
      if (!definition.values.includes(value)) {
        return {
          error: `Invalid value for user input ${JSON.stringify(titleOrKey)}: expected one of ${JSON.stringify(
            definition.values,
          )}`,
        };
      }
    } else if (definition.type === "custom") {
      if (definition.dataType === "string" && typeof value !== "string") {
        return {
          error: `Invalid type for user input ${JSON.stringify(titleOrKey)}: expected string`,
        };
      }
      if (definition.dataType === "number" && typeof value !== "number") {
        return {
          error: `Invalid type for user input ${JSON.stringify(titleOrKey)}: expected number`,
        };
      }
      if (definition.dataType === "boolean" && typeof value !== "boolean") {
        return {
          error: `Invalid type for user input ${JSON.stringify(titleOrKey)}: expected boolean`,
        };
      }
      if (definition.dataType === "Date" && isNaN(Date.parse(String(value)))) {
        return {
          error: `Invalid type for user input ${JSON.stringify(titleOrKey)}: expected Date`,
        };
      }
    } else if (
      ["table-column", "table-name", "table-and-column"].includes(
        definition.type,
      )
    ) {
      if (typeof value !== "string") {
        return {
          error: `Invalid type for user input ${JSON.stringify(titleOrKey)}: expected string for ${definition.type}`,
        };
      }
    } else {
      return {
        error: `Unknown user input type for ${JSON.stringify(titleOrKey)}`,
      };
    }
  }
};
