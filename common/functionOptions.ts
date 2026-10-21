import {
  getActionFunctions,
  type AnyObject,
  type ClientServerFunction,
  type JSONB,
} from "prostgles-types";
import {
  actionColumnParamsSchema,
  getActionCaseSelect,
  type ActionButtonState,
} from "./actionColumn";
import {
  getJobActionSelect,
  getJobActionValue,
  jobActionSchema,
} from "./jobAction";

export const functionOptionsSchema = {
  action: {
    optional: true,
    type: {
      conditions: actionColumnParamsSchema.conditions,
      defaultValue: actionColumnParamsSchema.defaultValue,
      /** Labels for a job control function; its binding and status policy are derived automatically. */
      job: { type: jobActionSchema, optional: true },
    },
  },
  defaultArgs: { record: { values: "any" }, optional: true },
  outputTable: { type: "string", optional: true },
} as const;

export const functionOptionsJsonbSchema = {
  record: { partial: true, values: { type: functionOptionsSchema } },
} as const;

export type FunctionOptions = JSONB.GetObjectType<typeof functionOptionsSchema>;
export type FunctionOptionsMap = Partial<Record<string, FunctionOptions>>;

export const getFunctionOptions = (
  method: ClientServerFunction | undefined,
) => {
  if (!method) return;
  const options = method.function_options as FunctionOptions | undefined;
  const binding = method.jobControl;
  const { job, ...action } = options?.action ?? {};
  return {
    ...options,
    action: { ...action, job: binding && { ...job, ...binding } },
  };
};

export const getFunctionActionValueKey = (key: string) =>
  `${key}__function_state`;

export const getFunctionActionSelect = (
  method: ClientServerFunction | undefined,
  key: string,
): AnyObject => {
  const action = getFunctionOptions(method)?.action;
  const expression = getActionCaseSelect(
    action?.job ? { ...action, defaultValue: {} } : (action ?? {}),
  );
  return {
    ...getJobActionSelect(action?.job, key),
    ...(expression ? { [getFunctionActionValueKey(key)]: expression } : {}),
  };
};

export const getTableFunctionActionSelect = (
  methods: Record<string, ClientServerFunction>,
  table: Parameters<typeof getActionFunctions>[1],
): AnyObject =>
  Object.assign(
    {},
    ...getActionFunctions(methods, table).map(({ methodName }) =>
      getFunctionActionSelect(methods[methodName], methodName),
    ),
  );

export const getFunctionActionValue = (
  method: ClientServerFunction | undefined,
  row: AnyObject,
  key: string,
  overrides: ActionButtonState = {},
): ActionButtonState => {
  const state = row[getFunctionActionValueKey(key)] as string | undefined;
  const action = getFunctionOptions(method)?.action;
  const values = {
    ...action?.defaultValue,
    // Conditional states must not inherit a disabled or loading default.
    ...(state && !action?.job ?
      { disabledInfo: undefined, isLoading: undefined }
    : {}),
    ...(state ? (JSON.parse(state) as ActionButtonState) : {}),
    ...overrides,
  };
  const jobValue = getJobActionValue(action?.job, row, key);
  return {
    ...values,
    ...jobValue,
    disabledInfo: jobValue.disabledInfo || values.disabledInfo,
  };
};
