import { mdiReload } from "@mdi/js";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ToolResultMessage, ToolUseMessage } from "./ToolUseChatMessage";
import React, { useMemo } from "react";
import Btn from "@components/Btn";
import { useAlert } from "@components/AlertProvider";
import ErrorComponent from "@components/ErrorComponent";
import { getMCPToolNameParts } from "@common/prostglesMcp";
import { isEqual } from "prostgles-types";

type P = {
  chatId: number;
  toolRequest: ToolUseMessage;
  toolResult: { messageId: string; messagePart: ToolResultMessage } | undefined;
  variant: "icon" | "text";
  newInput?: any;
};
export const ToolUseReRun = ({
  chatId,
  toolRequest,
  toolResult,
  variant,
  newInput,
}: P) => {
  const {
    dbsMethods: { reRunMCPServerTool },
  } = usePrglCore();
  const { addAlert } = useAlert();
  const nameParts = getMCPToolNameParts(toolRequest.name);
  const inputChanged = useMemo(() => {
    return !isEqual(toolRequest.input, newInput);
  }, [toolRequest.input, newInput]);
  if (!toolResult || !reRunMCPServerTool || !nameParts) return null;
  const { serverName, toolName } = nameParts;
  return (
    <Btn
      variant="faded"
      color="action"
      title="Re-run tool with same input"
      className={variant === "icon" ? "show-on-parent-hover" : ""}
      iconPath={mdiReload}
      size="small"
      children={
        variant === "text" ?
          inputChanged ?
            "Re-run with changes"
          : "Re-run"
        : undefined
      }
      onClickPromise={async () => {
        const result = await reRunMCPServerTool({
          chatId,
          serverName,
          toolName,
          args: newInput ?? toolRequest.input,
          reRunToolUseId: toolRequest.id,
        });
        console.log("Re-run result:", result);
        if (result.isError) {
          addAlert({
            title: "Error re-running tool",
            children: <ErrorComponent error={result.content} />,
          });
        }
      }}
    />
  );
};
