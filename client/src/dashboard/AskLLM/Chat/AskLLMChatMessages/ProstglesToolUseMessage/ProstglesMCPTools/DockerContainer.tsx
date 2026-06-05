import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getEntries, sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { CodeFileBrowser } from "@components/CodeFileBrowser/CodeFileBrowser";
import { FlexCol, FlexRow } from "@components/Flex";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import { Icon } from "@components/Icon/Icon";
import Loading from "@components/Loader/Loading";
import { MonacoLogs } from "@components/MonacoLogs/MonacoLogs";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { Stopwatch } from "@components/Stopwatch";
import {
  mdiChevronDown,
  mdiChevronUp,
  mdiChip,
  mdiDocker,
  mdiLanConnect,
  mdiMemory,
  mdiStopCircleOutline,
  mdiTimerLockOutline,
} from "@mdi/js";
import { StatusDotCircleIcon } from "@pages/Account/Sessions";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { omitKeys, type JSONB } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type {
  ToolResultMessage,
  ToolUseMessage,
} from "../../ToolUseChatMessage/ToolUseChatMessage";
import { ToolUseReRunBtn } from "../../ToolUseChatMessage/ToolUseReRunBtn";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useUserInput } from "./AgenticWorkflow/hooks/useUserInput";
import { UserInput } from "./AgenticWorkflow/UserInput";
import { useTypedToolUseResultDataV2 } from "./common/useTypedToolUseResultData";
import { ToolUseResultError } from "./ToolUseResultError";

export type DockerContainerInputData = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["run_code_in_sandbox"]["schema"]["type"]
>;

export const DockerContainer = ({
  toolUseId,
  toolUseResult,
  input,
  chatId,
  isShownInToolUseRequest,
  onGetNewInput,
}: Pick<ProstglesMCPToolsProps, "chatId" | "isShownInToolUseRequest"> & {
  toolUseId: string;
  input: DockerContainerInputData;
  toolUseResult: ToolResultMessage | undefined;
  onGetNewInput: (input: DockerContainerInputData) => ToolUseMessage;
}) => {
  const [editedFiles, setEditedFiles] = useState<Record<string, string>>();

  const tool_use_id = toolUseId;
  const {
    dbs,
    dbsMethods: { stopDockerContainer },
  } = usePrgl();
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
  const userInputState = useUserInput(input.userInput, undefined);
  const { userInputValue } = userInputState;

  const { data, updatedToolUse } = useMemo(() => {
    const data = {
      ...input,
      files: {
        ...input.files,
        ...editedFiles,
      },
      ...((userInputValue || input.userInputValue) && {
        userInputValue: {
          ...input.userInputValue,
          ...userInputValue,
        },
      }),
    };
    const updatedToolUse = onGetNewInput(data);
    return {
      updatedToolUse,
      data,
    };
  }, [input, editedFiles, userInputValue, onGetNewInput]);

  const schema =
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["run_code_in_sandbox"][
      "outputSchema"
    ];
  const resultObj = useTypedToolUseResultDataV2(toolUseResult, schema);
  const resultData = resultObj?.data;

  const toolUseState = useMemo(() => {
    if (isShownInToolUseRequest) {
      return {
        state: "not-started" as const,
      };
    }
    if (toolUseResult?.is_error) {
      return {
        state: "error" as const,
        container,
        error: toolUseResult.content,
      };
    }

    if (!toolUseResult) {
      return {
        state: "loading" as const,
        container,
      };
    }

    return {
      state: container?.finished ? ("finished" as const) : ("running" as const),
      container,
    };
  }, [isShownInToolUseRequest, toolUseResult, container]);
  const [showLogs, setShowLogs] = useState(true);
  const logs = useMemo(() => {
    return (
      (container?.log ?? resultData?.log)?.map((l) => l.text).join("") ?? ""
    );
  }, [container?.log, resultData?.log]);

  return (
    <FullscreenWrapper
      data-command="DockerSandboxCreateContainer"
      title={(minimised) => (
        <>
          <FlexRow className="pl-p5 f-1 min-w-0">
            {toolUseState.state === "loading" ?
              <Loading sizePx={16} className="text-1" />
            : <StatusDotCircleIcon
                title={toolUseState.state}
                color={toolUseState.state === "running" ? "green" : "gray"}
              />
            }
            {minimised && (
              <Icon path={mdiDocker} sizeName="small" className="text-1" />
            )}
            <div
              className="text-ellipsis min-w-0 ws-nowrap f-1 ta-start"
              title={
                data.reason ||
                `${resultData?.command ?? ""}\n\n${JSON.stringify(omitKeys(data, ["files"]))}`
              }
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
          {(toolUseState.state === "running" ||
            toolUseState.state === "loading") &&
            stopDockerContainer && (
              <Btn
                title="Stop"
                color="danger"
                variant="faded"
                size="small"
                data-command="DockerSandboxCreateContainer.stop"
                iconPath={mdiStopCircleOutline}
                onClickPromise={async () => {
                  await stopDockerContainer({
                    chatId,
                    toolUseId,
                  });
                }}
              />
            )}
          {toolUseResult && (
            <ToolUseReRunBtn
              chatId={chatId}
              toolRequest={updatedToolUse}
              variant="text"
              newInput={data}
            />
          )}
        </>
      )}
    >
      <FlexCol className=" ai-start gap-0 f-1">
        <CodeFileBrowser
          modelsGroupId={toolUseId}
          files={data.files}
          onChange={({ fileName, content }) => {
            setEditedFiles((prev) => ({
              ...prev,
              [fileName]: content,
            }));
          }}
        />

        {container && (
          <FullscreenWrapper
            className="as-stretch w-full"
            borderWrapperClassName="bt b-color bg-color-2 w-full ta-start rounded-unset"
            data-command="DockerSandboxCreateContainer.Logs"
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

                {toolUseState.state === "error" && !container.finished ? null
                : <Stopwatch
                    title="Runtime"
                    startTime={new Date(container.created)}
                    endTime={
                      container.finished ?
                        new Date(container.finished)
                      : undefined
                    }
                  />}
              </FlexRow>
            }
          >
            {showLogs && logs && (
              <MonacoLogs
                key={"logs"}
                className="f-p5 b-unset"
                style={monacoStyle}
                logs={logs}
                maxHeight={0}
              />
            )}
          </FullscreenWrapper>
        )}

        <UserInput {...userInputState} />
      </FlexCol>
      <ToolUseResultError className="p-1" toolUseResult={toolUseResult} />
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
