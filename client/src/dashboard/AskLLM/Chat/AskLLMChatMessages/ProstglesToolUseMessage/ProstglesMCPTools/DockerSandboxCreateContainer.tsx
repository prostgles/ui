import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getEntries, sliceText } from "@common/utils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { CodeFileBrowser } from "@components/CodeFileBrowser/CodeFileBrowser";
import { CopyToClipboardBtn } from "@components/CopyToClipboardBtn";
import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { MonacoLogs } from "@components/MonacoLogs/MonacoLogs";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import {
  mdiChevronDown,
  mdiChevronUp,
  mdiChip,
  mdiLanConnect,
  mdiMemory,
  mdiTimerLockOutline,
} from "@mdi/js";
import { omitKeys, type JSONB } from "prostgles-types";
import React, { useState } from "react";
import { PopupSection } from "../../ToolUseChatMessage/PopupSection";
import { ToolUseReRun } from "../../ToolUseChatMessage/ToolUseReRun";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useTypedToolUseResultData } from "./common/useTypedToolUseResultData";

export type DockerSandboxCreateContainerData = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["create_container"]["schema"]["type"]
>;

export const DockerSandboxCreateContainer = ({
  message,
  toolUseResult: toolResult,
  chatId,
}: ProstglesMCPToolsProps) => {
  const toolUseResult = toolResult?.toolUseResultMessage;
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
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["create_container"][
      "outputSchema"
    ];
  const resultObj = useTypedToolUseResultData(toolUseResult, schema);
  const [showLogs, setShowLogs] = useState(Boolean(resultObj?.log.length));

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
          {toolResult && (
            <ToolUseReRun
              chatId={chatId}
              toolRequest={message}
              variant="text"
              toolResult={{
                messagePart: toolResult.toolUseResultMessage,
                messageId: toolResult.toolUseResult.id,
              }}
            />
          )}
        </>
      }
    >
      <FlexCol className="DockerSandboxCreateContainer b b-color ai-start gap-0 f-1">
        <CodeFileBrowser
          files={data.files}
          onChange={({ fileName, content }) => {
            setEditedFiles((prev) => ({
              ...prev,
              [fileName]: content,
            }));
          }}
        />
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
          <MonacoLogs
            key={"logs"}
            className="f-p5"
            data-command="DockerSandboxCreateContainer.Logs"
            style={{ width: "100%", minHeight: 100 }}
            logs={resultObj?.log.map((l) => l.text).join("") ?? ""}
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
