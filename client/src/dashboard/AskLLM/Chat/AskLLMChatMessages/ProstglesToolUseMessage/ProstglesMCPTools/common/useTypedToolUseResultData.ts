import { findArr } from "@common/llmUtils";
import { getJSONBSchemaValidationError, type JSONB } from "prostgles-types";
import type { ToolResultMessage } from "../../../ToolUseChatMessage/ToolUseChatMessage";
import { useMemo } from "react";
export const useTypedToolUseResultData = <S extends JSONB.FieldType>(
  toolUseResult: ToolResultMessage | undefined,
  schema: S,
): JSONB.GetSchemaType<S> | undefined => {
  //@ts-ignore
  const resultObj = useMemo(() => {
    try {
      if (toolUseResult && !toolUseResult.is_error) {
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
