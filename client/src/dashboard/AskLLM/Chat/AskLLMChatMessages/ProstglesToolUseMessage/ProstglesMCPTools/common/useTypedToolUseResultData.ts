import { findArr } from "@common/llmUtils";
import { getJSONBSchemaValidationError, type JSONB } from "prostgles-types";
import type { ToolResultMessage } from "../../../ToolUseChatMessage/ToolUseChatMessage";
import { useMemo } from "react";
export const useTypedToolUseResultData = <S extends JSONB.FieldType>(
  toolUseResult: ToolResultMessage | undefined,
  schema: S,
  parseErrors = false,
): JSONB.GetSchemaType<S> | undefined => {
  //@ts-ignore
  const resultObj = useMemo(() => {
    try {
      if (toolUseResult && (parseErrors || !toolUseResult.is_error)) {
        const { content } = toolUseResult;
        const stringContent =
          typeof content === "string" ? content : (
            findArr(content, { type: "text" } as const)?.text
          );
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
  }, [schema, toolUseResult]);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return resultObj;
};
