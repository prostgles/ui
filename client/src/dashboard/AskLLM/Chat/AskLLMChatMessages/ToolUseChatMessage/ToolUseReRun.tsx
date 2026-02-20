import { mdiReload } from "@mdi/js";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ToolResultMessage, ToolUseMessage } from "./ToolUseChatMessage";
import React from "react";
import Btn from "@components/Btn";
import { useAlert } from "@components/AlertProvider";
import ErrorComponent from "@components/ErrorComponent";
import { getMCPToolNameParts } from "@common/prostglesMcp";

type P = {
  chatId: number;
  toolRequest: ToolUseMessage;
  toolResult: { messageId: string; messagePart: ToolResultMessage } | undefined;
  variant: "icon" | "text";
};
export const ToolUseReRun = ({
  chatId,
  toolRequest,
  toolResult,
  variant,
}: P) => {
  const {
    dbs,
    dbsMethods: { callMCPServerTool },
  } = usePrglCore();
  const { addAlert } = useAlert();
  const nameParts = getMCPToolNameParts(toolRequest.name);
  if (!toolResult || !callMCPServerTool || !nameParts) return null;
  const { serverName, toolName } = nameParts;
  return (
    <Btn
      variant="faded"
      color="action"
      title="Re-run tool with same input"
      className={variant === "icon" ? "show-on-parent-hover" : ""}
      iconPath={mdiReload}
      size="small"
      children={variant === "text" ? "Re-run" : undefined}
      onClickPromise={async () => {
        const result = await callMCPServerTool({
          chatId,
          serverName,
          toolName,
          args: toolRequest.input,
        });
        console.log("Re-run result:", result);
        if (result.isError) {
          addAlert({
            title: "Error re-running tool",
            children: <ErrorComponent error={result.content} />,
          });
        } else {
          const { content } = result;
          await dbs.llm_messages.update(
            { id: toolResult.messageId },
            {
              message: [
                {
                  type: "tool_result",
                  content: content as unknown as {
                    type: "text";
                    text: string;
                  }[],
                  tool_name: toolResult.messagePart.tool_name,
                  tool_use_id: toolResult.messagePart.tool_use_id,
                },
              ],
            },
          );
        }
      }}
    />
  );
};
