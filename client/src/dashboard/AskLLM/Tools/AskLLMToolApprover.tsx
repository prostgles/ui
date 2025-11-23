import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useCallback, useMemo } from "react";

import { getMCPToolNameParts } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { Marked } from "@components/Chat/Marked";
import { FlexCol, FlexRow } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";
import type { Prgl } from "../../../App";
import { isEmpty } from "../../../utils";
import type { DBS } from "../../Dashboard/DBS";
import { ProstglesMCPToolsWithUI } from "../Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesToolUseMessage";
import type { ToolUseMessage } from "../Chat/AskLLMChatMessages/ToolUseChatMessage/ToolUseChatMessage";
import {
  useLLMToolsApprover,
  type ApproveRequest,
  type ToolApproval,
} from "./useLLMToolsApprover";

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
      toolUseMessage: ToolUseMessage;
    } & ApproveRequest
  >();

  const onRequestToolUse = useCallback(
    async (req: ApproveRequest, toolUseMessage: ToolUseMessage) => {
      return new Promise<ToolApproval>((resolve) => {
        setMustApprove({
          toolUseMessage,
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
                req.type === "prostgles-db"
              ) {
                await dbs.llm_chats.update(
                  {
                    id: activeChatId,
                  },
                  {
                    db_data_permissions:
                      req.tool_name === "execute_sql_with_commit" ?
                        {
                          Mode: "Run commited SQL",
                          auto_approve,
                        }
                      : req.tool_name === "execute_sql_with_rollback" ?
                        {
                          Mode: "Run readonly SQL",
                          auto_approve,
                        }
                      : {
                          ...(activeChat.db_data_permissions as Extract<
                            typeof activeChat.db_data_permissions,
                            { Mode: "Custom" }
                          >),
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
              mode: toolUseResponse,
            });
          },
        });
      });
    },
    [
      dbs.llm_chats_allowed_mcp_tools,
      dbs.llm_chats_allowed_functions,
      dbs.llm_chats,
      activeChatId,
      activeChat,
    ],
  );
  const nameParts = useMemo(
    () => (mustApprove ? getMCPToolNameParts(mustApprove.name) : undefined),
    [mustApprove],
  );

  useLLMToolsApprover({ ...props, requestApproval: onRequestToolUse });

  if (!mustApprove) return null;

  const { toolUseMessage, description, name } = mustApprove;

  const ToolUI = ProstglesMCPToolsWithUI[name];
  return (
    <Popup
      title={
        mustApprove.type === "mcp" ?
          `Allow tool from ${nameParts?.serverName} to run?`
        : `Allow function to run?`
      }
      showFullscreenToggle={{}}
      onClose={() => {
        setMustApprove(undefined);
      }}
      clickCatchStyle={{ opacity: 1 }}
      contentStyle={{
        maxWidth: "min(800px, 100vw)",
        width: "100%",
      }}
      contentClassName="p-1 f-1 as-center"
      footerButtons={[
        {
          label: "Deny",
          color: "danger",
          variant: "faded",
          "data-command": "AskLLMToolApprover.Deny",
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
          "data-command": "AskLLMToolApprover.AllowOnce",
          onClick: () => {
            mustApprove.onResponse("once");
            setMustApprove(undefined);
          },
        },
        {
          label: "Allow always",
          color: "action",
          variant: "filled",
          "data-command": "AskLLMToolApprover.AllowAlways",
          onClick: () => {
            mustApprove.onResponse("for-chat");
            setMustApprove(undefined);
          },
        },
      ]}
    >
      <FlexCol className="f-1">
        <FlexRow>
          Run <strong>{nameParts?.toolName}</strong>
          {mustApprove.type === "mcp" && (
            <FlexRow>
              from <strong>{nameParts?.serverName}</strong>
            </FlexRow>
          )}
        </FlexRow>
        <Marked
          style={{ maxHeight: "200px" }}
          className="ta-start"
          content={description}
          codeHeader={undefined}
          loadedSuggestions={undefined}
          sqlHandler={undefined}
        />
        {!isEmpty(toolUseMessage.input) && (
          <>
            {ToolUI ?
              <ToolUI.component
                chatId={activeChat.id}
                message={toolUseMessage}
                toolUseResult={undefined}
                workspaceId={undefined}
              />
            : <CodeEditorWithSaveButton
                label="Input"
                value={JSON.stringify(toolUseMessage.input, null, 2)}
                language="json"
              />
            }
          </>
        )}
      </FlexCol>
    </Popup>
  );
};
