import type {
  AnyObject,
  DBSchemaTable,
  JobControlBinding,
  JobRecord,
  JSONB,
} from "prostgles-types";
import type { ActionButtonState } from "./actionColumn";

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
): ActionButtonState => {
  if (!options) return {};
  const job = (
    row[getJobActionValueKey(options)] as JobActionRow[] | undefined
  )?.[0];

  const disabledInfo =
    !job ? "Job has not started"
    : options.allowedStatuses.includes(job.status) ? undefined
    : `Job control is not allowed while the job is ${job.status}`;

  if (options.operation === "cancel" || options.operation === "rerun") {
    return {
      text:
        options.operation === "cancel" ?
          (options.runningText ?? "Cancel")
        : (options.succeededText ?? "Rerun"),
      isLoading:
        options.operation === "cancel" &&
        !!job?.cancel_requested &&
        (job.status === "pending" || job.status === "running"),
      disabledInfo,
    };
  }
  if (!job) return { isLoading: false };
  if (job.status === "pending" || job.status === "running") {
    return {
      text:
        job.progress_message ||
        options.runningText ||
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

/* Every control for the same job link shares one lookup, across action columns. */
const getJobActionValueKey = ({ tableName, columnName }: JobControlBinding) =>
  `__job_${JSON.stringify([tableName, columnName])}`;
