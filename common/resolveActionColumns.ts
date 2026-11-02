import { getActionFunctions, type ClientServerFunction } from "prostgles-types";
import type { ActionColumnParams, ActionColumnsParams } from "./actionColumn";

export const resolveActionColumns = (
  actions: ActionColumnsParams["actions"],
  methods: Record<string, Pick<ClientServerFunction, "input" | "jobControl">>,
  table: Parameters<typeof getActionFunctions>[1],
): ({ columnName: string } | ActionColumnParams)[] =>
  actions.flatMap((action) => {
    if (!("methodsForJobColumn" in action)) return [action];
    return getActionFunctions(methods, table)
      .filter(
        ({ methodName }) =>
          methods[methodName]?.jobControl?.columnName ===
          action.methodsForJobColumn,
      )
      .map(({ methodName, argName }) => ({ methodName, argName }));
  });
