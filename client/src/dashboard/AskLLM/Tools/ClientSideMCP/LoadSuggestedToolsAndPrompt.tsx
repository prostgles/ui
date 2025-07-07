import { mdiPlus } from "@mdi/js";
import React from "react";
import { type DBSSchema } from "../../../../../../commonTypes/publishUtils";
import Btn from "../../../../components/Btn";
import { usePrgl } from "../../../../pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "../../../../utils";
import { useAlert } from "../../../../components/AlertProvider";
import { FlexCol } from "../../../../components/Flex";
import { getMCPToolNameParts } from "../../../../../../commonTypes/mcp";

type P = {
  chatId: number;
  message: Extract<
    DBSSchema["llm_messages"]["message"][number],
    { type: "tool_use" }
  >;
};

export const LoadSuggestedToolsAndPrompt = ({ chatId, message }: P) => {
  const { dbs, connectionId } = usePrgl();
  const data = message.input as {
    suggested_mcp_tools: string[];
    suggested_database_tools: string[];
    suggested_prompt: string;
  };

  const { addAlert } = useAlert();
  return (
    <FlexCol>
      <Btn
        color="action"
        iconPath={mdiPlus}
        variant="filled"
        onClickPromise={async () => {
          await dbs.llm_chats_allowed_mcp_tools.delete({
            chat_id: chatId,
          });
          const allowedMcpTools = await dbs.mcp_server_tools.find({
            $or: data.suggested_mcp_tools
              .map((toolName) => {
                const nameParts = getMCPToolNameParts(toolName);
                if (!nameParts) return;
                return {
                  server_name: nameParts.serverName,
                  name: nameParts.toolName,
                };
              })
              .filter(isDefined),
          });
          await dbs.llm_chats_allowed_mcp_tools.insert(
            allowedMcpTools.map((t) => {
              return {
                chat_id: chatId,
                tool_id: t.id,
              };
            }),
          );

          await dbs.llm_chats_allowed_functions.delete({
            chat_id: chatId,
          });
          const allowedFunctions = await dbs.published_methods.find({
            $or: data.suggested_database_tools.map((toolName) => {
              const name = getMCPToolNameParts(toolName)!.toolName;
              return {
                connection_id: connectionId,
                name,
              };
            }),
          });
          await dbs.llm_chats_allowed_functions.insert(
            allowedFunctions.map((t) => {
              return {
                connection_id: connectionId,
                chat_id: chatId,
                server_function_id: t.id,
              };
            }),
          );

          addAlert(
            `${data.suggested_mcp_tools.length} MCP tools and ${data.suggested_database_tools} DB Functions added to this chat`,
          );
        }}
      >
        Create new chat with suggested tools and prompt
      </Btn>
    </FlexCol>
  );
};
