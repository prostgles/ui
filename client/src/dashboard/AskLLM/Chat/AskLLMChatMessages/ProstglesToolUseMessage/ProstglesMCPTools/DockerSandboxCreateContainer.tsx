import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getEntries, sliceText } from "@common/utils";
import { useAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { CopyToClipboardBtn } from "@components/CopyToClipboardBtn";
import ErrorComponent from "@components/ErrorComponent";
import { FILE_EXTENSION_TO_ICON_INFO } from "@components/FileBrowser/FileBrowser";
import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { MenuList } from "@components/MenuList";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import {
  mdiChevronDown,
  mdiChevronUp,
  mdiChip,
  mdiLanConnect,
  mdiMemory,
  mdiReload,
  mdiText,
  mdiTimerLockOutline,
} from "@mdi/js";
import { omitKeys, type JSONB } from "prostgles-types";
import React, { useState } from "react";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import { PopupSection } from "../../ToolUseChatMessage/PopupSection";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useTypedToolUseResultData } from "./common/useTypedToolUseResultData";

export type DockerSandboxCreateContainerData = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["docker-sandbox"]["create_container"]["schema"]["type"]
>;

const monacoOptions = {
  ...MONACO_READONLY_DEFAULT_OPTIONS,
  readOnly: false,
  lineNumbers: "on",
} as const;

export const DockerSandboxCreateContainer = ({
  message,
  toolUseResult: toolResult,
  chatId,
}: ProstglesMCPToolsProps) => {
  const toolUseResult = toolResult?.toolUseResultMessage;
  const { addAlert } = useAlert();
  const initialData = message.input as DockerSandboxCreateContainerData;
  const [editedFiles, setEditedFiles] = useState<Record<string, string>>();
  const data = {
    ...initialData,
    files: {
      ...initialData.files,
      ...editedFiles,
    },
  };

  const schema =
    PROSTGLES_MCP_SERVERS_AND_TOOLS["docker-sandbox"]["create_container"][
      "outputSchema"
    ];
  const resultObj = useTypedToolUseResultData(toolUseResult, schema);
  const [showLogs, setShowLogs] = useState(Boolean(resultObj?.log.length));
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
    <PopupSection
      titleItems={
        <>
          <div
            className="text-ellipsis min-w-0 ws-nowrap f-1 ta-start"
            title={`${resultObj?.command ?? ""}\n\n${JSON.stringify(omitKeys(data, ["files"]))}`}
          >
            {sliceText(resultObj?.command, 100) ??
              "Docker Sandbox Create Container"}
          </div>
          <ScrollFade className="flex-row gap-1 oy-auto min-w-0 f-1 no-scroll-bar">
            {data.cpus && (
              <FlexRow title={"CPUs"} className="gap-p25 pointer">
                <Icon path={mdiChip} />
                <div>{data.cpus}</div>
              </FlexRow>
            )}
            {data.memory && (
              <FlexRow title={"Memory"} className="gap-p25 pointer">
                <Icon path={mdiMemory} />
                <div>{data.memory}</div>
              </FlexRow>
            )}
            <FlexRow title={"Timeout"} className="gap-p25 pointer">
              <Icon path={mdiTimerLockOutline} />
              <div>
                {getMillisecondsAsSingleInterval(data.timeout ?? 30_000)}
              </div>
            </FlexRow>
            <FlexRow title={"Network mode"} className="gap-p25 pointer">
              <Icon path={mdiLanConnect} />
              <div>{data.networkMode ?? "none"}</div>
            </FlexRow>
          </ScrollFade>
          <CopyToClipboardBtn
            size="small"
            content={JSON.stringify(message.input)}
          />
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
        </>
      }
    >
      <FlexCol className="DockerSandboxCreateContainer b b-color ai-start gap-0 f-1">
        <FlexRow className="min-w-0 min-h-0 ai-start gap-0 w-full max-w-full f-1">
          <MenuList
            activeKey={activeFilePath}
            items={Object.keys(data.files).map((filePath) => {
              const ext = filePath.toLowerCase().split(".").pop() ?? "txt";
              return {
                key: filePath,
                label: filePath,
                leftIconPath:
                  FILE_EXTENSION_TO_ICON_INFO[ext]?.iconPath ?? mdiText,
                iconStyle: { opacity: 0.7 },
                onPress: () => setActiveFilePath(filePath),
              };
            })}
            variant="vertical"
            className="pointer bg-color-1 rounded-none"
            style={{ alignSelf: "stretch", fontSize: 14 }}
          />
          <FlexRow className="o-auto f-1 w-full h-full">
            {activeFilePath && (
              <MonacoEditor
                className="f-1 h-full"
                language={
                  FILE_EXTENSION_TO_ICON_INFO[extension]?.label ?? "plaintext"
                }
                loadedSuggestions={undefined}
                value={activeContent}
                style={{ width: "min(600px, 100%)", minHeight: 200 }}
                onChange={(newValue) => {
                  setEditedFiles((prev) => ({
                    ...prev,
                    [activeFilePath]: newValue,
                  }));
                }}
                options={monacoOptions}
              />
            )}
          </FlexRow>
        </FlexRow>
        <FlexRow className="bt b-color bg-color-2 w-full ta-start">
          <Btn
            size="small"
            title="Toggle"
            iconPosition="right"
            iconPath={showLogs ? mdiChevronDown : mdiChevronUp}
            onClick={() => setShowLogs(!showLogs)}
          >
            Logs
          </Btn>
          {resultObj && (
            <Chip label="Duration">
              {getMillisecondsAsSingleInterval(
                resultObj.buildDuration + resultObj.runDuration,
              )}
            </Chip>
          )}
        </FlexRow>
        {showLogs && (
          <MonacoEditor
            key={"logs"}
            language="text"
            className="f-p5"
            data-command="DockerSandboxCreateContainer.Logs"
            style={{ width: "100%", minHeight: 100 }}
            value={resultObj?.log.map((l) => l.text).join("") ?? ""}
            loadedSuggestions={undefined}
            options={MONACO_READONLY_DEFAULT_OPTIONS}
          />
        )}
      </FlexCol>
    </PopupSection>
  );
};

const getMillisecondsAsSingleInterval = (ms: number) => {
  const seconds = ms / 1000;
  const minutes = ms / 60_000;
  const hours = ms / (60 * 60_000);
  const result = {
    s: seconds,
    m: minutes,
    h: hours,
  };

  const entries = getEntries(result);

  return (
    entries
      .filter(([_n, v]) => v >= 1)
      .map(([n, v]) => `${v}${n}`)
      .at(-1) || `${seconds}s`
  );
};
