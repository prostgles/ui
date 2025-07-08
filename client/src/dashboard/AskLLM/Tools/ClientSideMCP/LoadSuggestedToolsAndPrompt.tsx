import {
  mdiLanguageTypescript,
  mdiOpenInNew,
  mdiScript,
  mdiTools,
} from "@mdi/js";
import type { JSONB } from "prostgles-types";
import React, { useState } from "react";
import {
  getMCPToolNameParts,
  type PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "../../../../../../commonTypes/mcp";
import { type DBSSchema } from "../../../../../../commonTypes/publishUtils";
import { sliceText } from "../../../../../../commonTypes/utils";
import { useAlert } from "../../../../components/AlertProvider";
import Btn from "../../../../components/Btn";
import { Marked } from "../../../../components/Chat/Marked";
import Chip from "../../../../components/Chip";
import { FlexCol, FlexRowWrap } from "../../../../components/Flex";
import { usePrgl } from "../../../../pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "../../../../utils";

type P = {
  chatId: number;
  message: Extract<
    DBSSchema["llm_messages"]["message"][number],
    { type: "tool_use" }
  >;
};

export const LoadSuggestedToolsAndPrompt = ({ chatId, message }: P) => {
  const { dbs, connectionId } = usePrgl();
  const data = message.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
  >;

  const { addAlert } = useAlert();
  const [expandPrompt, setExpandPrompt] = useState(false);
  return (
    <FlexCol>
      <Chip
        color="blue"
        className="pointer"
        leftIcon={{ path: mdiScript }}
        title={data.suggested_prompt}
        onClick={() => {
          setExpandPrompt((prev) => !prev);
        }}
      >
        {sliceText(data.suggested_prompt, 70)}
      </Chip>
      {expandPrompt && (
        <Marked
          codeHeader={undefined}
          loadedSuggestions={undefined}
          sqlHandler={undefined}
          content={data.suggested_prompt}
        />
      )}
      <FlexRowWrap>
        {data.suggested_mcp_tool_names.map((toolName) => {
          return (
            <Chip key={toolName} color="blue" leftIcon={{ path: mdiTools }}>
              {toolName}
            </Chip>
          );
        })}
        {data.suggested_database_tool_names.map((funcName) => {
          return (
            <Chip
              key={funcName}
              color="blue"
              leftIcon={{ path: mdiLanguageTypescript }}
            >
              {funcName}
            </Chip>
          );
        })}
      </FlexRowWrap>
      <Btn
        color="action"
        iconPath={mdiOpenInNew}
        variant="filled"
        onClickPromise={async () => {
          await dbs.llm_chats_allowed_mcp_tools.delete({
            chat_id: chatId,
          });
          const allowedMcpTools = await dbs.mcp_server_tools.find({
            $or: data.suggested_mcp_tool_names
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
            $or: data.suggested_database_tool_names.map((toolName) => {
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
            `${data.suggested_mcp_tool_names.length} MCP tools and ${data.suggested_database_tool_names} DB Functions added to this chat`,
          );
        }}
      >
        Load task chat
      </Btn>
    </FlexCol>
  );
};
