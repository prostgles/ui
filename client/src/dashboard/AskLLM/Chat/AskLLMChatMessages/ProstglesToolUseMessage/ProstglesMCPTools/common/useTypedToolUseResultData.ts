import { getJSONBSchemaValidationError, type JSONB } from "prostgles-types";
import { useMemo } from "react";
import type { ToolResultMessage } from "../../../ToolUseChatMessage/ToolUseChatMessage";
import { getToolUseResultString } from "./useToolUseResultString";
export const useTypedToolUseResultData = <S extends JSONB.FieldType>(
  toolUseResult: ToolResultMessage | undefined,
  schema: S,
  parseErrors = false,
): JSONB.GetSchemaType<S> | undefined => {
  //@ts-ignore
  const resultObj = useMemo(() => {
    try {
      if (toolUseResult && (parseErrors || !toolUseResult.is_error)) {
        const stringContent = getToolUseResultString(toolUseResult);
        if (!stringContent) return undefined;
        const parseResult = getJSONBSchemaValidationError(
          schema,
          JSON.parse(stringContent),
          {
            allowExtraProperties: true,
          },
        );
        if (parseResult.error) {
          console.error(
            "Tool use result content does not match schema:",
            parseResult.error,
          );
          return JSON.parse(stringContent) as JSONB.GetSchemaType<S>;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return parseResult.data;
      }
    } catch (error) {
      console.error("Error parsing tool use result content:", error);
    }
    return undefined;
  }, [parseErrors, schema, toolUseResult]);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return resultObj;
};
