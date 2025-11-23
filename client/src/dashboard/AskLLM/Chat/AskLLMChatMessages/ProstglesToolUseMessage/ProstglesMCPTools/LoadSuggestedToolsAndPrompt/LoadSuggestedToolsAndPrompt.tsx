import { type PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { sliceText } from "@common/utils";
import { Marked } from "@components/Chat/Marked";
import Chip from "@components/Chip";
import { FlexCol } from "@components/Flex";
import { mdiLanguageTypescript, mdiScript, mdiTools } from "@mdi/js";
import type { JSONB } from "prostgles-types";
import React, { useState } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { DatabaseAccessPermissions } from "../common/DatabaseAccessPermissions";
import { HeaderList } from "../common/HeaderList";
import { LoadSuggestedToolsAndPromptLoadBtn } from "./LoadSuggestedToolsAndPromptLoadBtn";

export const LoadSuggestedToolsAndPrompt = ({
  chatId,
  message,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message">) => {
  const data = message.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
  >;

  const [expandPrompt, setExpandPrompt] = useState(false);
  const {
    suggested_database_access,
    suggested_mcp_tool_names,
    suggested_prompt,
    suggested_database_tool_names,
  } = data;

  return (
    <FlexCol>
      <Chip
        title={"Prompt"}
        color="blue"
        className="pointer"
        leftIcon={{ path: mdiScript }}
        onClick={() => {
          setExpandPrompt((prev) => !prev);
        }}
      >
        {sliceText(suggested_prompt, 70)}
      </Chip>
      {expandPrompt && (
        <Marked
          codeHeader={undefined}
          loadedSuggestions={undefined}
          sqlHandler={undefined}
          content={suggested_prompt}
        />
      )}

      <DatabaseAccessPermissions {...suggested_database_access} />

      <HeaderList
        title="MCP Tools"
        items={suggested_mcp_tool_names}
        iconPath={mdiTools}
      />
      {suggested_database_tool_names && (
        <HeaderList
          title="Database Functions"
          items={suggested_database_tool_names}
          iconPath={mdiLanguageTypescript}
        />
      )}
      <LoadSuggestedToolsAndPromptLoadBtn chatId={chatId} message={message} />
    </FlexCol>
  );
};
