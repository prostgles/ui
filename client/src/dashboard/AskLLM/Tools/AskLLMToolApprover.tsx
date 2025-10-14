import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useCallback, useMemo } from "react";

import type { DBSSchema } from "../../../../../common/publishUtils";
import type { Prgl } from "../../../App";
import { FlexCol, FlexRow } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import Popup from "../../../components/Popup/Popup";
import { isEmpty } from "../../../utils";
import { CodeEditor } from "../../CodeEditor/CodeEditor";
import type { DBS } from "../../Dashboard/DBS";
import {
  useLLMToolsApprover,
  type ApproveRequest,
} from "./useLLMToolsApprover";
import { getMCPToolNameParts } from "../../../../../common/prostglesMcp";
import { Marked } from "@components/Chat/Marked";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";

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

  const { input, description } = mustApprove;
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
        {input && !isEmpty(input) && (
          <CodeEditorWithSaveButton
            label="Input"
            // contentTop={<FlexRow className="p-1 bg-color-1">Input</FlexRow>}
            value={JSON.stringify(input, null, 2)}
            language="json"
          />
        )}
      </FlexCol>
    </Popup>
  );
};
