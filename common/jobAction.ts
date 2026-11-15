import type {
  AnyObject,
  ClientServerFunction,
  DBSchemaTable,
  JobControlBinding,
  JobControlOperation,
  JobRecord,
  JSONB,
} from "prostgles-types";
import { getKeys, omitKeys } from "prostgles-types";
import type { ActionButtonState } from "./actionColumn";
import type { FunctionOptions } from "./functionOptions";

export const jobActionSchema = {
  runningText: { type: "string", optional: true },
  succeededText: { type: "string", optional: true },
  retryText: { type: "string", optional: true },
} as const;

type JobAction = JSONB.GetObjectType<typeof jobActionSchema> &
  JobControlBinding;
type JobActionRow = Pick<JobRecord, "status" | "progress_message"> & {
  cancel_requested: JobRecord["cancel_requested"] | undefined;
};

export const getJobActionSelect = (
  job: JobAction | undefined,
  tables: DBSchemaTable[],
): AnyObject =>
  job ?
    {
      [getJobActionValueKey(job)]: {
        $leftJoin: [
          {
            table: job.tableName,
            on: [{ [job.columnName]: "id" }],
          },
        ],
        select: {
          status: 1,
          progress_message: 1,
          ...((
            tables
              .find(({ name }) => name === job.tableName)
              ?.columns.some(
                ({ name, select }) => name === "cancel_requested" && select,
              )
          ) ?
            { cancel_requested: 1 }
          : {}),
        },
      },
    }
  : {};

export const getJobActionValue = (
  options: JobAction | undefined,
  row: AnyObject,
  operation: JobControlOperation | undefined = options?.operation,
): ActionButtonState => {
  if (!options) return {};
  const job = (
    row[getJobActionValueKey(options)] as JobActionRow[] | undefined
  )?.[0];

  const allowedStatuses =
    options.operations ?
      operation ? (options.operations[operation] ?? [])
      : Object.values(options.operations).flat()
    : options.allowedStatuses;
  const disabledInfo =
    !job ? "Job has not started"
    : allowedStatuses.includes(job.status) ? undefined
    : `Job control is not allowed while the job is ${job.status}`;

  if (operation === "cancel" || operation === "rerun") {
    return {
      text:
        operation === "cancel" ?
          (options.runningText ?? "Cancel")
        : (options.succeededText ?? "Rerun"),
      isLoading:
        operation === "cancel" &&
        !!job?.cancel_requested &&
        (job.status === "pending" || job.status === "running"),
      disabledInfo,
    };
  }
  if (!job)
    return {
      text: "Start",
      isLoading: false,
      ...(options.operations &&
        !options.operations.startOrRetry && { disabledInfo }),
    };
  if (job.status === "pending" || job.status === "running") {
    return {
      text:
        options.runningText ??
        (job.status === "pending" ? "Queued" : "Running"),
      isLoading: true,
      disabledInfo,
    };
  }
  if (job.status === "succeeded") {
    return {
      text: options.succeededText ?? "Complete",
      color: "green",
      isLoading: false,
      disabledInfo,
    };
  }
  return {
    text: options.retryText ?? "Retry",
    color: "warn",
    isLoading: false,
    disabledInfo,
  };
};

export const getJobControlMethods = (
  method: ClientServerFunction,
): ClientServerFunction[] => {
  const job = method.jobControl;
  if (!job?.operations) return [method];
  const options = method.function_options as FunctionOptions | undefined;
  return getKeys(job.operations).flatMap((operation) => {
    const allowedStatuses = job.operations[operation];
    if (!allowedStatuses) return [];
    return [
      {
        ...method,
        ...(operation !== "startOrRetry" &&
          options?.action?.job && {
            function_options: {
              ...options,
              action: { ...options.action, job: undefined },
            },
          }),
        input: omitKeys(method.input ?? {}, ["operation"]),
        jobControl: {
          ...omitKeys(job, ["operations"]),
          operation,
          allowedStatuses,
        },
        run: (args?: Record<string, unknown>) =>
          method.run({ ...args, operation }),
      },
    ];
  });
};

/* Every control for the same job link shares one lookup, across action columns. */
const getJobActionValueKey = ({ tableName, columnName }: JobControlBinding) =>
  `__job_${JSON.stringify([tableName, columnName])}`;
