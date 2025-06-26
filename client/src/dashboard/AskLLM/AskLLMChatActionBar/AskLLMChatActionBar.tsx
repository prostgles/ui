import { mdiDatabase, mdiTools } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { FilterItem } from "prostgles-types";
import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import { FlexRow } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import { MCPServers } from "../../../pages/ServerSettings/MCPServers/MCPServers";
import { SmartForm } from "../../SmartForm/SmartForm";
import type { AskLLMChatProps } from "../AskLLMChat";
import { AskLLMChatActionBarModelSelector } from "./AskLLMChatActionBarModelSelector";
import { AskLLMChatActionBarPromptSelector } from "./AskLLMChatActionBarPromptSelector";

export const AskLLMChatActionBar = (
  props: Pick<AskLLMChatProps, "prgl" | "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
  },
) => {
  const { prgl, activeChat } = props;
  const activeChatId = activeChat.id;
  const { dbs } = prgl;

  const [loading, setLoading] = React.useState(false);
  const { data: allowedTools } = dbs.mcp_server_tools.useSubscribe(
    {
      $existsJoined: {
        "llm_chats_allowed_mcp_tools.llm_chats": {
          id: activeChatId,
        },
      },
    } as FilterItem,
    {
      select: {
        name: 1,
        server_name: 1,
      },
    },
  );

  return (
    <FlexRow className="gap-p5 pr-1">
      <PopupMenu
        title="MCP Tools"
        contentClassName="p-2"
        clickCatchStyle={{ opacity: 1 }}
        onClickClose={false}
        data-command="LLMChatOptions.MCPTools"
        onContentFinishedResizing={() => setLoading(false)}
        button={
          <Btn
            title={`MCP Tools Allowed in this chat${
              allowedTools?.length ?
                `: \n\n${allowedTools.map((t) => t.name).join("\n")}`
              : ""
            }`}
            {...btnStyleProps}
            color={allowedTools?.length ? "action" : undefined}
            iconPath={mdiTools}
            loading={loading}
            disabledInfo={
              !prgl.dbsMethods.getMcpHostInfo ? "Must be admin" : undefined
            }
            children={allowedTools?.length || null}
          />
        }
      >
        <MCPServers {...props.prgl} chatId={activeChat.id} />
      </PopupMenu>
      <PopupMenu
        title="Database access"
        data-command="LLMChatOptions.DatabaseAccess"
        contentClassName="p-2"
        positioning="above-center"
        button={
          <Btn
            iconPath={mdiDatabase}
            {...btnStyleProps}
            color={
              activeChat.db_data_permissions?.type === "Run SQL" ?
                "action"
              : undefined
            }
          />
        }
        onClickClose={false}
      >
        <SmartForm
          db={dbs as DBHandlerClient}
          label=""
          tableName="llm_chats"
          rowFilter={[{ fieldName: "id", value: activeChatId }]}
          tables={prgl.dbsTables}
          methods={prgl.dbsMethods}
          columns={{
            db_schema_permissions: 1,
            db_data_permissions: 1,
          }}
          confirmUpdates={false}
          disabledActions={["delete", "clone", "update"]}
          showJoinedTables={false}
          contentClassname="p-0"
          jsonbSchemaWithControls={{ variant: "no-labels" }}
        />
      </PopupMenu>
      <AskLLMChatActionBarPromptSelector {...props} />
      <AskLLMChatActionBarModelSelector {...props} />
    </FlexRow>
  );
};

export const btnStyleProps = {
  variant: "icon",
  size: "small",
  style: { opacity: 0.75 },
} as const;
