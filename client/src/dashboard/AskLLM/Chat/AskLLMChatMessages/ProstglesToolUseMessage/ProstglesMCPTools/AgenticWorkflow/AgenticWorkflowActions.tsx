import { SuccessMessage } from "@components/Animations";
import Btn from "@components/Btn";
import Popup from "@components/Popup/Popup";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { omitKeys } from "prostgles-types";
import React, { useEffect, useState } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { LoadSuggestedWorkflowUserInput } from "./AgenticWorkflowUserInput";
import type { useValidatedWorkflowJson } from "./useValidatedWorkflowJson";

export const AgenticWorkflowActions = ({
  validatedWorkflowJson,
  chatId,
  inputData,
  onStarted,
}: Pick<ProstglesMCPToolsProps, "chatId"> & {
  inputData: { workflow_function_definition: string };
  validatedWorkflowJson: ReturnType<typeof useValidatedWorkflowJson>;
  onStarted: () => void;
}) => {
  const {
    dbsMethods: { startAgenticWorkflow },
  } = usePrgl();

  const [workflowResult, setWorkflowResult] = useState<unknown>();
  const [userInputValue, setUserInputValue] = useState<Record<string, unknown>>(
    {},
  );
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  useEffect(() => {
    if (workflowResult) {
      setShowSuccessMessage(true);
      const timeout = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      return () => clearTimeout(timeout);
    } else {
      setShowSuccessMessage(false);
    }
  }, [workflowResult]);

  return (
    <>
      {showSuccessMessage && (
        <Popup>
          <SuccessMessage message="Workflow finished successfully!" />
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
        className="ml-auto"
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
          onStarted();
          const res = await startAgenticWorkflow!({
            chatId,
            workflowTs: inputData.workflow_function_definition,
            ...omitKeys(validatedWorkflowJson.result, ["isValid"]),
            userInputValue,
          }).catch((err) => {
            return err;
          });

          console.log(res);
          if (res.state !== "finished") {
            throw new Error(
              `Agentic workflow container finished with status: ${res.state}. \nLogs: \n\n${res.log.map((l) => l.text).join("\n")}`,
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
