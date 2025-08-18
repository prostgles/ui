import { findArr } from "../../../../../../../../common/llmUtils";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "../../../../../../../../common/prostglesMcp";
import { sliceText } from "../../../../../../../../common/utils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { MenuList } from "@components/MenuList";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import {
  mdiBash,
  mdiCodeJson,
  mdiDocker,
  mdiLanguageGo,
  mdiLanguageHtml5,
  mdiLanguageJavascript,
  mdiLanguageMarkdown,
  mdiLanguagePython,
  mdiLanguageRuby,
  mdiLanguageTypescript,
  mdiReload,
  mdiText,
} from "@mdi/js";
import {
  getJSONBObjectSchemaValidationError,
  omitKeys,
  type JSONB,
} from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import { useAlert } from "@components/AlertProvider";
import ErrorComponent from "@components/ErrorComponent";
import type { ToolResultMessage } from "src/dashboard/AskLLM/Chat/AskLLMChatMessages/ToolUseChatMessage";

export type DockerSandboxCreateContainerData = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["docker-sandbox"]["create_container"]["schema"]["type"]
>;

export const DockerSandboxCreateContainer = ({
  message,
  toolUseResult: toolResult,
  chatId,
}: ProstglesMCPToolsProps) => {
  const toolUseResult = toolResult?.toolUseResultMessage;
  const { addAlert } = useAlert();
  const data = message.input as DockerSandboxCreateContainerData;
  const { resultObj } = useToolUseResultData(toolUseResult);
  const [activeFilePath, setActiveFilePath] = useState(
    Object.keys(data.files)[0],
  );
  const activeContent = data.files[activeFilePath ?? ""] ?? "";
  const extension = activeFilePath?.toLowerCase().split(".").pop() ?? "txt";
  const {
    dbsMethods: { callMCPServerTool },
    dbs,
  } = usePrgl();

  return (
    <FlexCol className="DockerSandboxCreateContainer b b-color ai-start gap-0 f-1">
      <FlexRow className="bg-color-1 p-p5 ws-nowrap min-w-0 max-w-600 bb b-color w-full max-w-full">
        <div
          className="text-ellipsis min-w-0 ws-nowrap f-1 ta-start"
          title={`${resultObj?.command ?? ""}\n\n${JSON.stringify(omitKeys(data, ["files"]))}`}
        >
          {sliceText(resultObj?.command, 100) ??
            "Docker Sandbox Create Container"}
        </div>
        {callMCPServerTool && toolResult && (
          <Btn
            variant="faded"
            color="action"
            iconPath={mdiReload}
            size="small"
            onClickPromise={async () => {
              const result = await callMCPServerTool(
                chatId,
                "docker-sandbox",
                "create_container",
                data,
              );
              console.log("Re-run result:", result);
              if (result.isError) {
                addAlert({
                  title: "Error re-running tool",
                  children: <ErrorComponent error={result.content} />,
                });
              } else {
                await dbs.llm_messages.update(
                  { id: toolResult.toolUseResult.id },
                  {
                    message: [
                      {
                        type: "tool_result",
                        content: result.content,
                        tool_name:
                          toolUseResult?.tool_name ??
                          "docker-sandbox--create_container",
                        tool_use_id: toolUseResult!.tool_use_id,
                      },
                    ],
                  },
                );
              }
            }}
          >
            Re-run
          </Btn>
        )}
      </FlexRow>
      <FlexRow className="min-w-0 ai-start gap-0 w-full max-w-full f-1">
        <MenuList
          activeKey={activeFilePath}
          items={Object.keys(data.files).map((filePath) => {
            const ext = filePath.toLowerCase().split(".").pop() ?? "txt";
            return {
              key: filePath,
              label: filePath,
              leftIconPath: extensionToInfo[ext]?.iconPath ?? mdiText,
              iconStyle: { opacity: 0.7 },
              onPress: () => setActiveFilePath(filePath),
            };
          })}
          variant="vertical"
          className="pointer bg-color-1 rounded-none"
          style={{ alignSelf: "stretch", fontSize: 14 }}
        />
        <FlexRow className="o-auto f-1 w-full h-full">
          <MonacoEditor
            className="f-1 h-full"
            language={extensionToInfo[extension]?.label ?? "plaintext"}
            loadedSuggestions={undefined}
            value={activeContent}
            style={{ width: "min(600px, 100%)", minHeight: 100 }}
            options={MONACO_READONLY_DEFAULT_OPTIONS}
          />
        </FlexRow>
      </FlexRow>
      <div className="bt b-color px-1 py-p25 bg-color-2 w-full ta-start">
        Logs
      </div>
      <MonacoEditor
        key={"logs"}
        language="text"
        className="f-1"
        style={{ width: "100%", minHeight: 100 }}
        value={resultObj?.log.map((l) => l.text).join("") ?? ""}
        loadedSuggestions={undefined}
        options={MONACO_READONLY_DEFAULT_OPTIONS}
      />
    </FlexCol>
  );
};

const useToolUseResultData = (toolUseResult: ToolResultMessage | undefined) => {
  const resultObj = useMemo(() => {
    try {
      if (toolUseResult && !toolUseResult.is_error) {
        const { content } = toolUseResult;
        const stringContent =
          typeof content === "string" ? content : (
            findArr(content, { type: "text" } as const)?.text
          );
        if (!stringContent) return undefined;
        const parseResult = getJSONBObjectSchemaValidationError(
          PROSTGLES_MCP_SERVERS_AND_TOOLS["docker-sandbox"]["create_container"][
            "outputSchema"
          ]["type"],
          JSON.parse(stringContent).result,
          "DockerSandboxCreateContainer output",
        );
        return parseResult.data;
      }
    } catch (error) {
      console.error("Error parsing tool use result content:", error);
    }
    return undefined;
  }, [toolUseResult]);

  return { resultObj };
};

const extensionToInfo: Record<string, { label: string; iconPath?: string }> = {
  ts: { iconPath: mdiLanguageTypescript, label: "typescript" },
  js: { iconPath: mdiLanguageJavascript, label: "javascript" },
  py: { iconPath: mdiLanguagePython, label: "python" },
  rb: { iconPath: mdiLanguageRuby, label: "ruby" },
  go: { iconPath: mdiLanguageGo, label: "go" },
  sh: { iconPath: mdiBash, label: "shell" },
  dockerfile: { iconPath: mdiDocker, label: "dockerfile" },
  txt: { label: "plaintext" },
  json: { iconPath: mdiCodeJson, label: "json" },
  yaml: { label: "yaml" },
  css: { label: "css" },
  html: { label: "html", iconPath: mdiLanguageHtml5 },
  md: { iconPath: mdiLanguageMarkdown, label: "markdown" },
  sql: { label: "sql" },
  Dockerfile: { iconPath: mdiDocker, label: "dockerfile" },
};
