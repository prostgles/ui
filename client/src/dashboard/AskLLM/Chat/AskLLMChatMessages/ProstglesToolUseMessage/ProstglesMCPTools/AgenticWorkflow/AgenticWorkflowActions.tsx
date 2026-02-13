import Btn from "@components/Btn";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import Popup from "@components/Popup/Popup";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { omitKeys } from "prostgles-types";
import React, { useState } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { LoadSuggestedWorkflowUserInput } from "./AgenticWorkflowUserInput";
import type { useValidatedWorkflowJson } from "./useValidatedWorkflowJson";

export const AgenticWorkflowActions = ({
  validatedWorkflowJson,
  chatId,
  inputData,
}: Pick<ProstglesMCPToolsProps, "chatId"> & {
  inputData: { workflow_function_definition: string };
  validatedWorkflowJson: ReturnType<typeof useValidatedWorkflowJson>;
}) => {
  const {
    dbsMethods: { startAgenticWorkflow },
  } = usePrgl();

  const [workflowResult, setWorkflowResult] = useState<any>();
  const [userInputValue, setUserInputValue] = useState<Record<string, unknown>>(
    {},
  );

  return (
    <>
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

      <LoadSuggestedWorkflowUserInput
        validatedWorkflowJson={validatedWorkflowJson}
        userInputValue={userInputValue}
        setUserInputValue={setUserInputValue}
      />

      <Btn
        variant="filled"
        color="action"
        disabledInfo={
          !startAgenticWorkflow ?
            "Starting agentic workflows is not allowed/available"
          : !validatedWorkflowJson ?
            "Validating workflow"
          : validatedWorkflowJson.isError ?
            "Workflow validation failed"
          : undefined
        }
        data-command="LoadSuggestedWorkflow.start"
        onClickPromise={async () => {
          if (
            validatedWorkflowJson?.isError ||
            !validatedWorkflowJson?.result ||
            !validatedWorkflowJson.result.isValid
          ) {
            throw new Error(`Cannot start workflow due error`);
          }
          const res = await startAgenticWorkflow!({
            chatId,
            workflowTs: inputData.workflow_function_definition,
            ...omitKeys(validatedWorkflowJson.result, ["isValid"]),
            userInputValue,
          });

          console.log(res);
          if (res.state !== "finished") {
            throw new Error(
              `Agentic workflow container finished with status: ${res.state}. Logs: ${res.log.map((l) => l.text).join("\n")}`,
            );
          } else {
            setWorkflowResult(res);
          }
        }}
      >
        Start workflow
      </Btn>
    </>
  );
};
