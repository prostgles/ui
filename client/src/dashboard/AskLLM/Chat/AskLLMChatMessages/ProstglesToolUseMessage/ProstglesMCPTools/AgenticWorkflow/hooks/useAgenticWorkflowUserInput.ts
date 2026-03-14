import { isDefined } from "@common/filterUtils";
import type { DBSSchema } from "@common/publishUtils";
import { useMemo, useState } from "react";
import type { SingleGroupFilter } from "src/dashboard/AccessControl/OptionControllers/FilterControl";

export type UseAgenticWorkflowUserInputReturn = ReturnType<
  typeof useAgenticWorkflowUserInput
>;
export const useAgenticWorkflowUserInput = (
  userInput:
    | DBSSchema["agentic_workflows"]["definition_data"]["userInput"]
    | undefined,
  lastValueUsed: Record<string, unknown> | undefined,
) => {
  const userInputDefaults = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(userInput ?? {})
          .map(([key, item]) =>
            item.defaultValue !== undefined ?
              ([key, item.defaultValue ?? ""] as const)
            : undefined,
          )
          .filter(isDefined),
      ),
    [userInput],
  );
  const [editedUserInputValue, setUserInputValue] =
    useState<Record<string, unknown>>();
  const userInputValue =
    editedUserInputValue ?? lastValueUsed ?? userInputDefaults;

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
