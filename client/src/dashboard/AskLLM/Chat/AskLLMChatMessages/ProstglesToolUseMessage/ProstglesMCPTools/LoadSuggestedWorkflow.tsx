import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { MonacoLogRenderer } from "@components/MonacoLogRenderer/MonacoLogRenderer";
import { mdiLanguageTypescript } from "@mdi/js";
import React, { useMemo, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useJSONBParsedData } from "./common/useJSONBParsedData";
import Popup from "@components/Popup/Popup";

export const LoadSuggestedWorkflow = ({
  message,
  toolUseResult,
  chatId,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message" | "toolUseResult">) => {
  const {
    dbsMethods: { startAgenticWorkflow },
  } = usePrglCore();
  const inputValidation = useJSONBParsedData(
    message.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_agentic_workflow"]
      .schema,
  );

  if (inputValidation.error !== undefined) {
    return (
      <ErrorComponent
        error={`Error parsing tool input: ${inputValidation.error}`}
      />
    );
  }
  const { data: inputData } = inputValidation;
  const toolUseResultJson = useMemo(() => {
    if (!toolUseResult) return;
    const { content } = toolUseResult.toolUseResultMessage;
    const contentStr =
      typeof content === "string" ? content
      : content[0]?.type === "text" ? content[0].text
      : undefined;
    if (contentStr) {
      try {
        return {
          isError: toolUseResult.toolUseResultMessage.is_error,
          result: JSON.parse(contentStr),
        };
      } catch (e) {
        console.error("Error parsing tool use result content as JSON", e);
        return;
      }
    }
  }, [toolUseResult]);

  const [workflowResult, setWorkflowResult] = useState<any>();

  return (
    <FlexCol className="w-full">
      {workflowResult && (
        <Popup title={"Workflow finished"}>
          <MonacoCodeInMarkdown
            codeHeader={undefined}
            codeString={JSON.stringify(workflowResult, null, 2)}
            language="json"
            loadedSuggestions={undefined}
            sqlHandler={undefined}
          />
        </Popup>
      )}
      <FlexCol className="rounded b b-action o-auto p-1">
        {/* <DatabaseAccessPermissions {...dbAccess} />
        <HeaderList
          title="MCP Tools"
          items={data.allowed_mcp_tool_names}
          iconPath={mdiTools}
        /> */}
        <MonacoCodeInMarkdown
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
          codeString={inputData.workflow_function_definition}
        />
        {toolUseResultJson?.isError && (
          <MonacoLogRenderer
            label="Error"
            logs={toolUseResultJson.result.logs}
          />
        )}
      </FlexCol>
      <Btn
        variant="filled"
        color="action"
        disabledInfo={
          !startAgenticWorkflow ?
            "Starting agentic workflows is not allowed/available"
          : !toolUseResultJson ?
            "Validating workflow"
          : toolUseResultJson.isError ?
            "Workflow validation failed"
          : undefined
        }
        data-command="LoadSuggestedWorkflow.start"
        onClickPromise={async () => {
          const res = await startAgenticWorkflow!({
            chatId,
            workflowTs: inputData.workflow_function_definition,
            ...toolUseResultJson?.result,
          });

          console.log(res);
          if (res.state !== "finished") {
            throw new Error(
              `Agentic workflow container did not finish successfully. Logs: ${res.log.map((l) => l.text).join("\n")}`,
            );
          } else {
            setWorkflowResult(res);
          }
        }}
      >
        Start workflow
      </Btn>
    </FlexCol>
  );
};
