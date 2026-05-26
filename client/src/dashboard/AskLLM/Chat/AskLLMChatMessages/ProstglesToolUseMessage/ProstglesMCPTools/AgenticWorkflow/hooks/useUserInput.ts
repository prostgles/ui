import type { DBSSchema } from "@common/publishUtils";
import { useState } from "react";
import type { SingleGroupFilter } from "src/dashboard/AccessControl/OptionControllers/FilterControl";

export type UseAgenticWorkflowUserInputReturn = ReturnType<typeof useUserInput>;
export const useUserInput = (
  userInput:
    | DBSSchema["agentic_workflows"]["definition_data"]["userInput"]
    | undefined,
  lastValueUsed: Record<string, unknown> | undefined,
) => {
  const [editedUserInputValue, setUserInputValue] =
    useState<Record<string, unknown>>();
  const userInputValue = editedUserInputValue ?? lastValueUsed;

  const [localFilter, setLocalFilter] = useState<
    Record<string, SingleGroupFilter>
  >({});

  return {
    userInput,
    userInputValue,
    setUserInputValue,
    localFilter,
    setLocalFilter,
  };
};
