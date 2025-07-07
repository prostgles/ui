import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useCallback } from "react";

import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { Prgl } from "../../../App";
import { FlexCol, FlexRow } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import Popup from "../../../components/Popup/Popup";
import { isEmpty } from "../../../utils";
import { CodeEditor } from "../../CodeEditor/CodeEditor";
import type { DBS } from "../../Dashboard/DBS";
import { type ApproveRequest } from "./useLLMChatAllowedTools";
import { useLLMToolsApprover } from "./useLLMToolsApprover";

export type AskLLMToolsProps = {
  dbs: DBS;
  db: DBHandlerClient;
  activeChat: DBSSchema["llm_chats"];
  prompt: DBSSchema["llm_prompts"];
  messages: DBSSchema["llm_messages"][];
  sendQuery: (
    msg: DBSSchema["llm_messages"]["message"] | undefined,
    isToolApproval: boolean,
  ) => Promise<void>;
  callMCPServerTool: Prgl["dbsMethods"]["callMCPServerTool"];
} & Pick<Prgl, "methods" | "connection">;

export const AskLLMToolApprover = (props: AskLLMToolsProps) => {
  const { dbs, activeChat } = props;
  const activeChatId = activeChat.id;
  const [mustApprove, setMustApprove] = React.useState<
    {
      onResponse: (mode: "once" | "for-chat" | "deny") => void;
      input: any;
    } & ApproveRequest
  >();

  const onRequestToolUse = useCallback(
    async (req: ApproveRequest, input: any) => {
      return new Promise<{ approved: boolean }>((resolve) => {
        setMustApprove({
          input,
          ...req,
          onResponse: async (toolUseResponse) => {
            if (toolUseResponse !== "deny") {
              const auto_approve = toolUseResponse === "for-chat";
              if (req.type === "mcp") {
                await dbs.llm_chats_allowed_mcp_tools.upsert(
                  { chat_id: activeChatId, tool_id: req.id },
                  {
                    chat_id: activeChatId,
                    tool_id: req.id,
                    auto_approve,
                  },
                );
              } else if (req.type === "prostgles-db-methods") {
                await dbs.llm_chats_allowed_functions.upsert(
                  { chat_id: activeChatId, server_function_id: req.id },
                  {
                    chat_id: activeChatId,
                    server_function_id: req.id,
                    auto_approve,
                  },
                );
              } else if (
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                req.type === "prostgles-db" &&
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                req.tool_name === "execute_sql"
              ) {
                await dbs.llm_chats.update(
                  {
                    id: activeChatId,
                  },
                  {
                    db_data_permissions: {
                      type: "Run SQL",
                      auto_approve,
                    },
                  },
                );
              } else {
                throw new Error(
                  `Unexpected tool use request ${JSON.stringify(req)}`,
                );
              }
            }
            resolve({
              approved: toolUseResponse !== "deny",
            });
          },
        });
      });
    },
    [
      activeChatId,
      dbs.llm_chats_allowed_mcp_tools,
      dbs.llm_chats_allowed_functions,
      dbs.llm_chats,
    ],
  );

  useLLMToolsApprover({ ...props, requestApproval: onRequestToolUse });

  if (!mustApprove) return null;

  const { input, description } = mustApprove;

  return (
    <Popup
      title={
        mustApprove.type === "mcp" ?
          `Allow tool from ${mustApprove.server_name} to run?`
        : `Allow function to run?`
      }
      onClose={() => {
        mustApprove.onResponse("deny");
        setMustApprove(undefined);
      }}
      clickCatchStyle={{ opacity: 1 }}
      rootStyle={{
        maxWidth: "min(600px, 100vw)",
      }}
      contentClassName="p-1"
      footerButtons={[
        {
          label: "Deny",
          color: "danger",
          variant: "faded",
          onClick: () => {
            mustApprove.onResponse("deny");
            setMustApprove(undefined);
          },
        },
        {
          className: "ml-auto",
          label: "Allow once",
          color: "action",
          variant: "filled",
          onClick: () => {
            mustApprove.onResponse("once");
            setMustApprove(undefined);
          },
        },
        {
          label: "Allow always",
          color: "action",
          variant: "filled",
          onClick: () => {
            mustApprove.onResponse("for-chat");
            setMustApprove(undefined);
          },
        },
      ]}
    >
      <FlexCol>
        <FlexRow>
          Run <strong>{mustApprove.name}</strong>
          {mustApprove.type === "mcp" && <>from {mustApprove.server_name}</>}
        </FlexRow>
        <InfoRow variant="naked" iconPath="" color="info">
          {description}
        </InfoRow>
        {input && !isEmpty(input) && (
          <CodeEditor value={JSON.stringify(input, null, 2)} language="json" />
        )}
      </FlexCol>
    </Popup>
  );
};
