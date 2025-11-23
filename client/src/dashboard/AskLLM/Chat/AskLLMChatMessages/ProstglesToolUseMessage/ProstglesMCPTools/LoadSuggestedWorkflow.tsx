import { type PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import { MarkdownMonacoCode } from "@components/Chat/MarkdownMonacoCode/MarkdownMonacoCode";
import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { mdiDatabaseEdit, mdiLanguageTypescript, mdiTools } from "@mdi/js";
import type { JSONB } from "prostgles-types";
import React, { useMemo } from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { HeaderList } from "./common/HeaderList";
import { DatabaseAccessPermissions } from "./common/DatabaseAccessPermissions";

export const LoadSuggestedWorkflow = ({
  chatId,
  message,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message">) => {
  const data = message.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_agent_workflow"]["schema"]["type"]
  >;

  const dbAccess = data.database_access;

  return (
    <FlexCol className="w-full">
      <FlexCol className="rounded b b-action o-auto p-1">
        <DatabaseAccessPermissions {...dbAccess} />
        <HeaderList
          title="MCP Tools"
          items={data.allowed_mcp_tool_names}
          iconPath={mdiTools}
        />
        {/* {data.allowed_database_tool_names?.map((funcName, idx) => {
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
        })} */}
        <MarkdownMonacoCode
          key={"agent_definitions"}
          className="f-1 h-full"
          language={"json"}
          sqlHandler={undefined}
          codeHeader={() => (
            <FlexRow>
              <Icon path={mdiLanguageTypescript} className="mr-p5" />
              <div>Agent Definitions</div>
            </FlexRow>
          )}
          loadedSuggestions={undefined}
          codeString={JSON.stringify(data.agent_definitions, null, 2)}
        />
        <MarkdownMonacoCode
          key={"workflow_function_definition"}
          className="f-1 h-full"
          language={"typescript"}
          sqlHandler={undefined}
          codeHeader={() => (
            <FlexRow>
              <Icon path={mdiLanguageTypescript} className="mr-p5" />
              <div>Workflow Function Definition</div>
            </FlexRow>
          )}
          loadedSuggestions={undefined}
          codeString={data.workflow_function_definition}
        />
      </FlexCol>
      <Btn
        variant="filled"
        color="action"
        onClick={() => {
          throw new Error("Not implemented yet");
        }}
      >
        Start workflow
      </Btn>
    </FlexCol>
  );
};
