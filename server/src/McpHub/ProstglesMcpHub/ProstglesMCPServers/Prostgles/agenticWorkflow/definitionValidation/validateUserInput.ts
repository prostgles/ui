import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getProperty, type ExtractBy } from "@common/utils";
import type { JSONBTypeIfDefined } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { isObject } from "prostgles-types";

type UserInput = JSONBTypeIfDefined<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["run_code_in_sandbox"]["schema"]["type"]["userInput"]
>;

type UserInputItem = UserInput[keyof UserInput];
export const validateUserInput = (
  userInputValue: Record<string, unknown>,
  userInputDefinition: UserInput,
) => {
  const resultWithDefaults: Record<string, unknown> = {};
  for (const [key, definition] of Object.entries(userInputDefinition)) {
    const titleOrKey = definition.title || key;
    const value =
      userInputValue[key] ??
      ("defaultValue" in definition ? definition.defaultValue : undefined);
    resultWithDefaults[key] = value;
    const prepareError = (message: string) =>
      ({
        isValid: false,
        error: `${message}: ${JSON.stringify(titleOrKey)}`,
        inputKey: key,
      }) as const;
    if (definition.optional && value === undefined) continue;
    if (!definition.optional && value === undefined) {
      return prepareError(`Missing required user input`);
    }
    const validators = {
      "table-and-column": () => {
        if (
          !value ||
          typeof getProperty(value, "tableName") !== "string" ||
          typeof getProperty(value, "columnName") !== "string"
        ) {
          return prepareError(`Invalid or missing tableName`);
        }
      },
      "table-filter": () => {
        if (!isObject(value)) {
          return prepareError(
            `Invalid type for user input. Expected object with filter conditions`,
          );
        }
      },
      "table-column": () => {
        if (typeof value !== "string") {
          return prepareError(
            `Invalid type for user input. Expected string with column name`,
          );
        }
      },
      custom: (v, definition) => {
        if (definition.dataType === "string" && typeof value !== "string") {
          return prepareError(`Invalid type for user input. Expected string`);
        }
        if (definition.dataType === "number" && typeof value !== "number") {
          return prepareError(`Invalid type for user input. Expected number`);
        }
        if (definition.dataType === "boolean" && typeof value !== "boolean") {
          return prepareError(`Invalid type for user input. Expected boolean`);
        }
        if (
          definition.dataType === "Date" &&
          isNaN(Date.parse(String(value)))
        ) {
          return prepareError(
            `Invalid type for user input. Expected valid Date string`,
          );
        }
      },
      enum: (v, definition) => {
        if (typeof value !== "string") {
          return prepareError(
            `Invalid type for user input. Expected string for enum`,
          );
        }
        if (!definition.values.includes(value)) {
          return prepareError(
            `Invalid value for user input. Expected one of ${JSON.stringify(definition.values)}`,
          );
        }
      },
      "table-column-value": () => {
        // any value
      },
      "table-column-values": () => {
        if (!Array.isArray(value)) {
          return prepareError(`Invalid user input. Expecting array`);
        }
      },
      "table-name": () => {
        if (typeof value !== "string") {
          return prepareError(
            `Invalid type for user input. Expected string with table name`,
          );
        }
      },
      "folder-path": () => {
        if (typeof value !== "string") {
          return prepareError(
            `Invalid type for user input. Expected string with folder path`,
          );
        }
      },
      "file-path": () => {
        if (typeof value !== "string") {
          return prepareError(
            `Invalid type for user input. Expected string with file path`,
          );
        }
      },
    } satisfies {
      [Type in UserInputItem["type"]]: (
        value: unknown,
        definition: ExtractBy<UserInputItem, "type", Type>,
      ) => { error: string } | undefined | void;
    };

    const { type: typeName } = definition;
    validators[typeName](
      value,
      //@ts-expect-error union of functions with different signatures
      definition,
    );
  }
  return { isValid: true, value: resultWithDefaults } as const;
};
