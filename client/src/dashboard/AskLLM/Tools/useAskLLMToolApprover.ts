import { useCallback, useState } from "react";

import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useLLMSchemaStr } from "../Chat/useLLMSchemaStr";

export const useAskLLMToolApprove = () => {
  const {
    dbs,
    dbsMethods: { approveToolUse },
    tables,
    sql,
    connection,
  } = usePrgl();
  const { data: requests } = dbs.mcp_tool_approval_requests.useSubscribe(
    {
      response: null,
    },
    {
      select: {
        "*": 1,
        mcp_server_tools: {
          description: 1,
        },
      },
      orderBy: { created: 1 },
    },
  );

  const [showRequestId, setShowRequestId] = useState<number>();
  const [firstRequest] = requests ?? [];
  const { data: chat } = dbs.llm_chats.useSubscribeOne(
    {
      id: firstRequest?.chat_id,
    },
    undefined,
    { skip: !firstRequest?.chat_id },
  );
  const { dbSchemaForPrompt, loaded } = useLLMSchemaStr({
    tables,
    sql,
    connection,
    activeChat: chat,
  });

  const respond = useCallback(
    async ({
      response,
      schema,
      id,
    }: {
      schema: string;
      id: number;
      response: "approve" | "deny" | "auto-approve";
    }) => {
      if (!approveToolUse) throw new Error("approveToolUse method not found");
      await approveToolUse({
        id,
        response,
        schema,
      });
    },
    [approveToolUse],
  );

  if (!loaded) {
    return;
  }
  return {
    requests,
    respond,
    dbSchemaForPrompt,
    showRequestId,
    setShowRequestId,
  };
};
