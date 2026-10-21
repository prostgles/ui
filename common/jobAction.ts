import type {
  AnyObject,
  JobControlBinding,
  JobStatus,
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
type JobActionRow = { status: JobStatus; progress_message: string | null };

export const getJobActionSelect = (
  job: JobAction | undefined,
  key: string,
): AnyObject =>
  job ?
    {
      [getJobActionValueKey(key)]: {
        $leftJoin: [
          {
            table: job.tableName,
            on: [{ [job.columnName]: "id" }],
          },
        ],
        select: { status: 1, progress_message: 1 },
      },
    }
  : {};

export const getJobActionValue = (
  options: JobAction | undefined,
  row: AnyObject,
  key: string,
): ActionButtonState => {
  const job = (
    row[getJobActionValueKey(key)] as JobActionRow[] | undefined
  )?.[0];
  if (!options) return {};

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
      isLoading: false,
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
  if (job.status === "failed" || job.status === "cancelled") {
    return {
      text: options.retryText ?? "Retry",
      color: "warn",
      isLoading: false,
      disabledInfo,
    };
  }
  return {};
};

const getJobActionValueKey = (key: string) => `${key}__job`;
