import React, { useCallback } from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { Prgl } from "../../../App";
import { FlexCol } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import Popup from "../../../components/Popup/Popup";
import { isEmpty } from "../../../utils";
import { CodeEditor } from "../../CodeEditor/CodeEditor";
import type { DBS } from "../../Dashboard/DBS";
import { useLLMTools, type ApproveRequest } from "./useLLMTools";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";

export type AskLLMToolsProps = {
  dbs: DBS;
  db: DBHandlerClient;
  activeChat: DBSSchema["llm_chats"];
  messages: DBSSchema["llm_messages"][];
  sendQuery: (
    msg: DBSSchema["llm_messages"]["message"] | undefined,
  ) => Promise<void>;
  callMCPServerTool: Prgl["dbsMethods"]["callMCPServerTool"];
} & Pick<Prgl, "methods">;

export const AskLLMTools = (props: AskLLMToolsProps) => {
  const { dbs, activeChat } = props;
  const activeChatId = activeChat.id;
  const [mustApprove, setMustApprove] = React.useState<
    {
      onAccepted: (mode: "once" | "for-chat" | "deny") => void;
      input: any;
    } & ApproveRequest
  >();

  const requestApproval = useCallback(
    async (req: ApproveRequest, input: any) => {
      return new Promise<{ approved: boolean }>((resolve) => {
        setMustApprove({
          input,
          ...req,
          onAccepted: async (mode) => {
            if (mode === "for-chat") {
              if (req.type === "mcp") {
                await dbs.llm_chats_allowed_mcp_tools.upsert(
                  { chat_id: activeChatId, tool_id: req.id },
                  {
                    chat_id: activeChatId,
                    tool_id: req.id,
                    auto_approve: true,
                  },
                );
              } else if (req.type === "function") {
                await dbs.llm_chats_allowed_functions.upsert(
                  { chat_id: activeChatId, server_function_id: req.id },
                  {
                    chat_id: activeChatId,
                    server_function_id: req.id,
                    auto_approve: true,
                  },
                );
              } else {
                await dbs.llm_chats.update(
                  {
                    id: activeChatId,
                  },
                  {
                    db_data_permissions: {
                      type: "Run SQL",
                      auto_approve: true,
                    },
                  },
                );
              }
            }
            resolve({
              approved: mode !== "deny",
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

  useLLMTools({ ...props, requestApproval });

  if (!mustApprove) return null;

  const { input, name, description } = mustApprove;

  return (
    <Popup
      title={
        mustApprove.type === "mcp" ?
          `Allow tool from ${mustApprove.server_name} to run?`
        : `Allow function to run?`
      }
      onClose={() => {
        mustApprove.onAccepted("deny");
        setMustApprove(undefined);
      }}
      clickCatchStyle={{ opacity: 1 }}
      rootStyle={{
        maxWidth: "min(600px, 100vw)",
      }}
      footerButtons={[
        {
          label: "Deny",
          color: "danger",
          variant: "faded",
          onClick: () => {
            mustApprove.onAccepted("deny");
            setMustApprove(undefined);
          },
        },
        {
          className: "ml-auto",
          label: "Approve once",
          color: "action",
          variant: "filled",
          onClick: () => {
            mustApprove.onAccepted("once");
            setMustApprove(undefined);
          },
        },
        {
          label: "Approve for this chat",
          color: "action",
          variant: "filled",
          onClick: () => {
            mustApprove.onAccepted("for-chat");
            setMustApprove(undefined);
          },
        },
      ]}
    >
      <FlexCol>
        <h4 className="mb-0 ta-start">
          {mustApprove.type === "mcp" ?
            `Run ${mustApprove.name} from ${mustApprove.server_name}`
          : `Run ${name}`}
        </h4>
        <InfoRow variant="naked" iconPath="">
          {description}
        </InfoRow>
        {input && !isEmpty(input) && (
          <CodeEditor value={JSON.stringify(input, null, 2)} language="json" />
        )}
      </FlexCol>
    </Popup>
  );
};
