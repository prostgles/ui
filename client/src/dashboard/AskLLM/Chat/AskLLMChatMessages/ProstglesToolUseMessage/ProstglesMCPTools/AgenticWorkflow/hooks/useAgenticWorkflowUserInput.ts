import { useState } from "react";
import type { ValidatedWorkflow } from "../useValidatedWorkflowJson";
import type { SingleGroupFilter } from "src/dashboard/AccessControl/OptionControllers/FilterControl";

export const useAgenticWorkflowUserInput = (
  userInput: ValidatedWorkflow["userInput"],
) => {
  const [userInputValue, setUserInputValue] = useState<Record<string, unknown>>(
    {},
  );

  const [localFilter, setLocalFilter] = useState<
    Record<string, SingleGroupFilter>
  >({});

  const missingRequiredInputs =
    userInput ?
      Object.entries(userInput)
        .filter(([_, inputItem]) => !inputItem.optional)
        .filter(([inputKey, _]) => {
          const value = userInputValue[inputKey];
          return value === undefined;
        })
        .map(([inputKey, inputItem]) => ({
          key: inputKey,
          title: inputItem.title || inputKey,
        }))
    : [];

  return {
    userInput,
    userInputValue,
    setUserInputValue,
    localFilter,
    setLocalFilter,
    missingRequiredInputs,
  };
};
