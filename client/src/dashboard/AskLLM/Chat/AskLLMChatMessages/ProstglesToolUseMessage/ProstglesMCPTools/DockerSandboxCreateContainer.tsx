import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getEntries, sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { CodeFileBrowser } from "@components/CodeFileBrowser/CodeFileBrowser";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import { Icon } from "@components/Icon/Icon";
import { MonacoLogs } from "@components/MonacoLogs/MonacoLogs";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { Stopwatch } from "@components/Stopwatch";
import {
  mdiChevronDown,
  mdiChevronUp,
  mdiChip,
  mdiLanConnect,
  mdiMemory,
  mdiStopCircleOutline,
  mdiTimerLockOutline,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { omitKeys, type JSONB } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { ToolUseReRun } from "../../ToolUseChatMessage/ToolUseReRun";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useTypedToolUseResultDataV2 } from "./common/useTypedToolUseResultData";
import { AgenticWorkflowUserInput } from "./AgenticWorkflow/AgenticWorkflowUserInput";
import { useAgenticWorkflowUserInput } from "./AgenticWorkflow/hooks/useAgenticWorkflowUserInput";

export type DockerSandboxCreateContainerData = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["run_code_in_sandbox"]["schema"]["type"]
>;

export const DockerSandboxCreateContainer = ({
  message,
  toolUseResult: toolResult,
  chatId,
}: ProstglesMCPToolsProps) => {
  const toolUseResult = toolResult?.toolUseResultMessage;
  const initialData = message.input as DockerSandboxCreateContainerData;
  const [editedFiles, setEditedFiles] = useState<Record<string, string>>();
  const userInputState = useAgenticWorkflowUserInput(initialData.userInput, {});
  const { userInputValue } = userInputState;
  const data = {
    ...initialData,
    files: {
      ...initialData.files,
      ...editedFiles,
    },
    userInputValue: {
      ...initialData.userInputValue,
      ...userInputValue,
    },
  };
  const { tool_use_id = "" } = toolUseResult ?? {};
  const { dbs } = usePrgl();
  const { data: container } = dbs.docker_containers.useSubscribeOne(
    {
      chat_id: chatId,
      tool_use_id,
    },
    {},
    {
      skip: !tool_use_id,
    },
  );
  console.log(container);
  const schema =
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["run_code_in_sandbox"][
      "outputSchema"
    ];
  const resultObj = useTypedToolUseResultDataV2(toolUseResult, schema);
  const resultData = resultObj?.data;
  const [showLogs, setShowLogs] = useState(true);
  const logs = useMemo(() => {
    return (
      (container?.log ?? resultData?.log)?.map((l) => l.text).join("") ?? ""
    );
  }, [container?.log, resultData?.log]);

  return (
    <FullscreenWrapper
      title={
        <>
          <FlexRow className="pl-p5 f-1 min-w-0">
            <div
              className="text-ellipsis min-w-0 ws-nowrap f-1 ta-start"
              title={`${resultData?.command ?? ""}\n\n${JSON.stringify(omitKeys(data, ["files"]))}`}
            >
              {sliceText(resultData?.command, 100) ??
                "Docker Sandbox Create Container"}
            </div>
          </FlexRow>
          <ScrollFade className="flex-row gap-1 oy-auto min-w-0 no-scroll-bar">
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
          {container && !container.finished && (
            <Btn
              title="Stop"
              color="danger"
              variant="faded"
              size="small"
              iconPath={mdiStopCircleOutline}
              onClickPromise={async () => {}}
            />
          )}
          {toolResult && (
            <ToolUseReRun
              chatId={chatId}
              toolRequest={message}
              variant="text"
              newInput={data}
              toolResult={{
                messagePart: toolResult.toolUseResultMessage,
                messageId: toolResult.toolUseResult.id,
              }}
            />
          )}
        </>
      }
    >
      <FlexCol className="DockerSandboxCreateContainer ai-start gap-0 f-1">
        <CodeFileBrowser
          files={data.files}
          onChange={({ fileName, content }) => {
            setEditedFiles((prev) => ({
              ...prev,
              [fileName]: content,
            }));
          }}
        />

        <FullscreenWrapper
          className="bt b-color bg-color-2 w-full ta-start rounded-unset"
          title={
            <FlexRow>
              <Btn
                size="small"
                title="Toggle"
                iconPosition="right"
                iconPath={showLogs ? mdiChevronDown : mdiChevronUp}
                onClick={() => setShowLogs(!showLogs)}
              >
                Logs
              </Btn>
              {container && (
                <Stopwatch
                  title="Runtime"
                  startTime={new Date(container.created)}
                  endTime={
                    container.finished ?
                      new Date(container.finished)
                    : undefined
                  }
                />
              )}
            </FlexRow>
          }
        >
          {showLogs && (
            <MonacoLogs
              key={"logs"}
              className="f-p5 b-unset"
              data-command="DockerSandboxCreateContainer.Logs"
              style={monacoStyle}
              logs={logs}
              maxHeight={0}
            />
          )}
        </FullscreenWrapper>

        <AgenticWorkflowUserInput {...userInputState} />
      </FlexCol>
      <ErrorComponent
        error={
          toolUseResult?.is_error ? toolUseResult.content : resultObj?.error
        }
      />
    </FullscreenWrapper>
  );
};

const monacoStyle = { width: "100%", minHeight: 100 };

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
