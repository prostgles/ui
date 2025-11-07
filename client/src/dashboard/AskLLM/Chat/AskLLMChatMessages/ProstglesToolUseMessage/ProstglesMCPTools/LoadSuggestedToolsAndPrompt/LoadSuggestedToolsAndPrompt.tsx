import { type PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { sliceText } from "@common/utils";
import { Marked } from "@components/Chat/Marked";
import Chip from "@components/Chip";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import {
  mdiDatabaseEdit,
  mdiDatabaseSearch,
  mdiLanguageTypescript,
  mdiScript,
  mdiTools,
} from "@mdi/js";
import type { JSONB } from "prostgles-types";
import React, { useState } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { LoadSuggestedToolsAndPromptLoadBtn } from "./LoadSuggestedToolsAndPromptLoadBtn";

export const LoadSuggestedToolsAndPrompt = ({
  chatId,
  message,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message">) => {
  const data = message.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
  >;

  const [expandPrompt, setExpandPrompt] = useState(false);
  const dbAccess = data.suggested_database_access;

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

      {dbAccess.Mode !== "None" && (
        <Chip
          title="Database access"
          leftIcon={{
            path:
              dbAccess.Mode === "execute_sql_commit" ?
                mdiDatabaseEdit
              : mdiDatabaseSearch,
          }}
          color="blue"
        >
          {dbAccess.Mode === "Custom" ?
            //@ts-ignore
            dbAccess.tables
              .map((t) => {
                return `${t.tableName}: ${[
                  "select",
                  "update",
                  "insert",
                  "delete",
                ]
                  .filter((v) => t[v])
                  .join(", ")}`;
              })
              .join("\n")
          : dbAccess.Mode === "execute_sql_rollback" ?
            "Execute SQL with rollback"
          : "Execute SQL with commit"}
        </Chip>
      )}
      <FlexRowWrap>
        {data.suggested_mcp_tool_names.map((toolName, idx) => {
          return (
            <Chip
              key={toolName + idx}
              title="MCP Tool"
              color="blue"
              leftIcon={{ path: mdiTools }}
            >
              {toolName}
            </Chip>
          );
        })}
        {data.suggested_database_tool_names?.map((funcName, idx) => {
          return (
            <Chip
              key={funcName + idx}
              color="blue"
              title="Database Function"
              leftIcon={{ path: mdiLanguageTypescript }}
            >
              {funcName}
            </Chip>
          );
        })}
      </FlexRowWrap>
      <LoadSuggestedToolsAndPromptLoadBtn chatId={chatId} message={message} />
    </FlexCol>
  );
};
