import { useMemo } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";

export type ValidatedWorkflow = Omit<
  Parameters<Required<GeneratedFunctionSchema>["startAgenticWorkflow"]>[0],
  "chatId" | "workflowTs" | "userInputValue" | "messageId"
>;

export const useValidatedWorkflowJson = ({
  toolUseResult,
}: Pick<ProstglesMCPToolsProps, "toolUseResult">) => {
  const toolUseResultJson = useMemo(() => {
    if (!toolUseResult) return;
    const { content } = toolUseResult.toolUseResultMessage;
    const contentStr =
      typeof content === "string" ? content
      : content[0]?.type === "text" ? content[0].text
      : undefined;
    if (contentStr) {
      try {
        return {
          isError: toolUseResult.toolUseResultMessage.is_error,
          result: JSON.parse(contentStr) as
            | (ValidatedWorkflow & { isValid: true })
            | { isValid: false; logs: string },
        };
      } catch (e) {
        return {
          isError: true,
          validationError: `Error parsing tool use result content as JSON`,
          contentStr,
        };
      }
    }
  }, [toolUseResult]);
  const { result } = toolUseResultJson ?? {};
  const validWorkflow = result?.isValid ? result : undefined;

  return { toolUseResultJson, validWorkflow };
};
