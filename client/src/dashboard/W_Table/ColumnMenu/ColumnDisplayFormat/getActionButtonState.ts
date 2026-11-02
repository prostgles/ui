import {
  getActionValueKey,
  type ActionButtonState,
  type ActionColumnParams,
} from "@common/actionColumn";
import {
  getFunctionActionValue,
  getFunctionOptions,
} from "@common/functionOptions";
import { resolveActionFunction } from "@common/resolveActionFunction";
import { getJobActionValue } from "@common/jobAction";
import { ROW_ACTIONS_COLUMN } from "prostgles-client";
import type {
  AnyObject,
  DBSchemaTable,
  ServerFunctionHandler,
} from "prostgles-types";
import { getJobActionFunctions } from "../../../ActionPopup/getJobActionFunctions";

export const getActionButtonState = ({
  methods,
  table,
  params,
  row,
  queryRow,
  stateKey,
  stored,
}: {
  methods: ServerFunctionHandler;
  table: DBSchemaTable;
  params: ActionColumnParams;
  row: AnyObject | undefined;
  queryRow: AnyObject;
  stateKey: string;
  stored?: { details: string | undefined };
}) => {
  const { method, action, error, hasAdditionalInputs } = resolveActionFunction(
    methods,
    table,
    params,
  );
  const allowedActions = queryRow[ROW_ACTIONS_COLUMN] as string[] | undefined;
  const matchesLookup =
    !action || !!allowedActions?.includes(action.methodName);
  const job = method?.jobControl;
  if (
    job &&
    getJobActionFunctions(methods, table, job, allowedActions)[0]
      ?.methodName !== params.methodName
  )
    return;
  if (!matchesLookup && !stored) return;
  const stateValue = queryRow[getActionValueKey(stateKey)] as
    string | undefined;
  const executionValues = {
    text: action?.lookup.showInRowCard?.actionLabel,
    color: action?.lookup.showInRowCard?.actionColor,
    ...getFunctionActionValue(method, queryRow, stateKey, {
      ...params.defaultValue,
      ...(stateValue ? { disabledInfo: undefined, isLoading: undefined } : {}),
      ...(stateValue ? (JSON.parse(stateValue) as ActionButtonState) : {}),
    }),
  };
  const jobOptions = getFunctionOptions(method)?.action.job;
  const values = {
    ...executionValues,
    ...getJobActionValue(
      jobOptions && { ...jobOptions, operation: "startOrRetry" },
      queryRow,
    ),
    disabledInfo: executionValues.disabledInfo,
  };
  const disabledInfo =
    error ? error
    : !row ? "Actions require an individual row"
    : values.disabledInfo || undefined;
  return {
    method,
    action,
    row,
    queryRow,
    values,
    buttonText: executionValues.text,
    text: values.text ?? (method ? params.methodName : "Action unavailable"),
    disabledInfo,
    buttonDisabledInfo:
      job && !error && row?.[job.columnName] ? undefined : disabledInfo,
    matchesLookup,
    stored,
    runImmediately:
      !job &&
      !hasAdditionalInputs &&
      (params.runImmediately ??
        getFunctionOptions(method)?.action.runImmediately ??
        false),
  };
};
