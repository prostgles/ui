import { getFunctionOptions } from "@common/functionOptions";
import { isCompleteJSONB } from "@components/JSONBSchema/isCompleteJSONB";
import type { AnyObject, ClientServerFunction, JSONB } from "prostgles-types";
import { omitKeys } from "prostgles-types";
import { useState } from "react";

export const useFunctionExecution = (
  method: ClientServerFunction,
  fixedArgs: AnyObject,
) => {
  const [args, setArgs] = useState<AnyObject>(() =>
    omitKeys(getDefaultFunctionArgs(method), Object.keys(fixedArgs)),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [execution, setExecution] = useState<Execution>({ status: "idle" });
  const inputSchema = method.input ?? {};
  const editableInputs = omitKeys(inputSchema, Object.keys(fixedArgs));
  const editableSchema: JSONB.JSONBSchema = {
    type: editableInputs,
  };
  const isRunning = execution.status === "running";
  const hasErrors = !isCompleteJSONB(
    { ...args, ...fixedArgs },
    { type: inputSchema },
  );

  const run = async () => {
    if (isRunning) return;
    if (hasErrors) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setExecution({ status: "running" });
    try {
      const params = Object.fromEntries(
        Object.entries({ ...args, ...fixedArgs }).filter(
          ([, value]) => value !== undefined,
        ),
      );
      const result = await method.run(
        Object.keys(inputSchema).length ? params : undefined,
      );
      setExecution({ status: "success", result });
    } catch (error) {
      setExecution({ status: "error", error });
    }
  };

  return {
    args,
    setArgs: (newArgs: AnyObject) => {
      if (isRunning) return;
      setArgs(newArgs);
      setExecution({ status: "idle" });
    },
    editableSchema,
    editableArgNames: Object.keys(editableInputs),
    showErrors,
    hasErrors,
    isRunning,
    execution,
    run,
  };
};

type Execution =
  | { status: "idle" | "running" }
  | { status: "success"; result: unknown }
  | { status: "error"; error: unknown };

const getDefaultFunctionArgs = (method: ClientServerFunction): AnyObject => {
  const defaults = getFunctionOptions(method)?.defaultArgs ?? {};
  return Object.fromEntries(
    Object.entries(method.input ?? {}).flatMap(([name, input]) => {
      const value =
        name in defaults ? defaults[name]
        : typeof input !== "string" && "defaultValue" in input ?
          input.defaultValue
        : undefined;
      return value === undefined ? [] : [[name, value]];
    }),
  );
};
