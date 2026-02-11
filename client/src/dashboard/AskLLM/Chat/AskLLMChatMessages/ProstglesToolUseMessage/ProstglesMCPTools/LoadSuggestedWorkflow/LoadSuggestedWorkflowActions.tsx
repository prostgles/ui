import Btn from "@components/Btn";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import Popup from "@components/Popup/Popup";
import React, { useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import type { useValidatedWorkflowJson } from "./useValidatedWorkflowJson";
import { omitKeys } from "prostgles-types";

export const LoadSuggestedWorkflowActions = ({
  validatedWorkflowJson,
  chatId,
  inputData,
}: Pick<ProstglesMCPToolsProps, "chatId"> & {
  inputData: { workflow_function_definition: string };
  validatedWorkflowJson: ReturnType<typeof useValidatedWorkflowJson>;
}) => {
  const {
    dbsMethods: { startAgenticWorkflow },
  } = usePrglCore();

  const [workflowResult, setWorkflowResult] = useState<any>();

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
    </>
  );
};
