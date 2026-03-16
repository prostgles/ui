import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import React, { useMemo } from "react";
import { useAskLLMSetupState } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";

export const InChatToolApprover = ({
  toolUseId,
  messageId,
  chatId,
}: {
  toolUseId: string;
  messageId: string;
  chatId: number;
}) => {
  const { toolApprovalState } = useAskLLMSetupState();
  const { requests, setShowRequestId } = toolApprovalState ?? {};
  const matchingRequests = useMemo(() => {
    if (!requests) return;
    return requests.filter(
      (r) =>
        r.chat_id === chatId &&
        r.response === null &&
        (r.tool_use_id === toolUseId ||
          (r.source.type === "proxy" &&
            r.source.parentToolUseMessageId === messageId)),
    );
  }, [requests, chatId, toolUseId, messageId]);

  if (!setShowRequestId || !toolApprovalState || !matchingRequests?.length) {
    return null;
  }
  return (
    <FlexCol>
      {matchingRequests.map(({ id, tool_name, source }) => (
        <FlexRow key={id}>
          {source.type === "proxy" && (
            <Btn onClick={() => setShowRequestId(id)}>Tool: {tool_name}</Btn>
          )}
          <Btn
            color="danger"
            variant="faded"
            size="small"
            onClickPromise={async () => {
              await toolApprovalState.respond({
                id,
                response: "deny",
                schema: toolApprovalState.dbSchemaForPrompt,
              });
            }}
          >
            Deny
          </Btn>
          <Btn
            color="action"
            variant="filled"
            size="small"
            onClickPromise={async () => {
              await toolApprovalState.respond({
                id,
                response: "approve",
                schema: toolApprovalState.dbSchemaForPrompt,
              });
            }}
          >
            Approve Once
          </Btn>
          <Btn
            color="action"
            variant="filled"
            size="small"
            onClickPromise={async () => {
              await toolApprovalState.respond({
                id,
                response: "auto-approve",
                schema: toolApprovalState.dbSchemaForPrompt,
              });
            }}
          >
            Approve Always
          </Btn>
        </FlexRow>
      ))}
    </FlexCol>
  );
};
