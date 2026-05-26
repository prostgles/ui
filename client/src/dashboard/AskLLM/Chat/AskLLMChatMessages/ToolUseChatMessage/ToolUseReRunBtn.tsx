import { getMCPToolNameParts } from "@common/mcpUtils";
import { useAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { mdiReload } from "@mdi/js";
import { isEmpty, isEqual } from "prostgles-types";
import React, { useMemo } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ToolUseMessage } from "./ToolUseChatMessage";

type P = {
  chatId: number;
  toolRequest: ToolUseMessage;
  variant: "icon" | "text";
  newInput?: unknown;
};
export const ToolUseReRunBtn = ({
  chatId,
  toolRequest,
  variant,
  newInput,
}: P) => {
  const {
    dbsMethods: { reRunMCPServerTool },
  } = usePrglCore();
  const { addAlert } = useAlert();
  const nameParts = getMCPToolNameParts(toolRequest.name);
  const inputChanged = useMemo(() => {
    return (
      toolRequest.input &&
      newInput &&
      !isEmpty(newInput) &&
      !isEqual(toolRequest.input, newInput)
    );
  }, [toolRequest.input, newInput]);
  if (!reRunMCPServerTool || !nameParts) return null;
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
