import React, { useCallback } from "react";
import { useLLMTools } from "./useLLMTools";
import type { DBS } from "../../Dashboard/DBS";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { Prgl } from "../../../App";
import Popup from "../../../components/Popup/Popup";
import { FlexCol } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import { CodeEditor } from "../../CodeEditor/CodeEditor";
import { Section } from "../../../components/Section";
import { isEmpty } from "../../../utils";

export type AskLLMToolsProps = {
  dbs: DBS;
  activeChatId: number;
  messages: DBSSchema["llm_messages"][];
  sendQuery: (
    msg: DBSSchema["llm_messages"]["message"] | undefined,
  ) => Promise<void>;
  callMCPServerTool: Prgl["dbsMethods"]["callMCPServerTool"];
} & Pick<Prgl, "methods">;

export const AskLLMTools = (props: AskLLMToolsProps) => {
  const { dbs, activeChatId } = props;
  const [mustApprove, setMustApprove] = React.useState<{
    onAccepted: (mode: "once" | "for-chat" | "deny") => void;
    tool: DBSSchema["mcp_server_tools"];
    input: any;
  }>();

  const requestApproval = useCallback(
    async (tool: DBSSchema["mcp_server_tools"], input: any) => {
      return new Promise<{ approved: boolean }>((resolve) => {
        setMustApprove({
          input,
          tool,
          onAccepted: async (mode) => {
            if (mode === "for-chat") {
              await dbs.llm_chats_allowed_mcp_tools.upsert(
                { chat_id: activeChatId, tool_id: tool.id },
                {
                  chat_id: activeChatId,
                  tool_id: tool.id,
                  auto_approve: true,
                },
              );
            }
            resolve({
              approved: mode !== "deny",
            });
          },
        });
      });
    },
    [activeChatId, dbs.llm_chats_allowed_mcp_tools],
  );

  useLLMTools({ ...props, requestApproval });

  if (!mustApprove) return null;

  const { tool, input } = mustApprove;

  return (
    <Popup
      title={`Allow tool from ${tool.server_name} to run?`}
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
          Run {tool.name} from {tool.server_name}
        </h4>
        <InfoRow variant="naked" iconPath="">
          {tool.description}
        </InfoRow>
        {input && !isEmpty(input) && (
          <CodeEditor value={JSON.stringify(input, null, 2)} language="json" />
        )}
      </FlexCol>
    </Popup>
  );
};
