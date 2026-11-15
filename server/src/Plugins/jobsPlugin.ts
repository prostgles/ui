import { CHIP_COLOR_NAMES } from "@common/ColumnConfig/chipColors";
import type { TableOptions } from "@common/managedTableSchema";
import type { HotReloadConfigOptions } from "@src/ConnectionManager/getHotReloadConfigs";
import type { JobRecord, JobStatus } from "prostgles-server";
import { mergeDefinitions } from "./mergeDefinitions";
import type { PluginDefinition } from "./Plugins";

export const getJobsPlugin = (
  tableName: string,
  jobs: HotReloadConfigOptions["jobs"],
  plugins: PluginDefinition[],
):
  | (PluginDefinition & {
      jobs: NonNullable<HotReloadConfigOptions["jobs"]>;
    })
  | undefined => {
  let definitions = jobs?.definitions;
  for (const plugin of plugins) {
    definitions = mergeDefinitions(definitions, plugin.jobDefinitions, "Job");
  }
  if (!definitions) return;

  return {
    jobs: { ...jobs, tableName, definitions },
    tableOptions: { [tableName]: jobsTableOptions },
  };
};

const jobStatusColors = {
  pending: "yellow",
  running: "blue",
  succeeded: "green",
  failed: "red",
  cancelled: "gray",
} satisfies Record<JobStatus, keyof typeof CHIP_COLOR_NAMES>;

const jobAgeFormat = {
  type: "Age",
  params: { variant: "short", showAgo: true, showTimestamp: true },
} as const;

const jobsTableOptions: TableOptions = {
  label: "Jobs",
  icon: "BriefcaseClockOutline",
  managedTableType: undefined,
  rowIconColumn: undefined,
  defaultColumns: [
    "job_name",
    "status",
    "progress_message",
    "progress_numeric",
    "attempts",
    "created_at",
    "duration",
    "error",
    "output",
  ] satisfies (keyof JobRecord | "duration")[],
  sort: [{ key: "created_at", asc: false }],
  referenceDisplay: { columns: [{ name: "status" }] },
  card: {
    headerColumn: "job_name",
    subHeaderColumn: "status",
    summaryFields: [
      "progress_numeric",
      "attempts",
      "created_at",
      "duration",
      "error",
      "output",
      "progress_message",
    ],
    layoutSections: [
      {
        items: [
          "id",
          "started_at",
          "finished_at",
          "target_table",
          "target_row_pkey",
          "params",
          "user_id",
          "occurrence",
          "reason",
          "max_attempts",
          "delay_ms",
          "backoff",
          "cancel_requested",
          "checkpoint",
          "has_checkpoint",
          "run_at",
          "lease_token",
          "locked_until",
          "max_stalled_count",
          "stalled_count",
        ],
      },
    ],
  },
  columns: {
    id: { label: "Job ID" },
    job_name: { label: "Job", width: 220 },
    status: {
      label: "Status",
      width: 120,
      style: {
        type: "Conditional",
        conditions: Object.entries(jobStatusColors).map(
          ([condition, color]) => {
            const style = CHIP_COLOR_NAMES[color];
            return {
              operator: "=",
              condition,
              chipColor: style.color,
              textColor: style.textColor,
              borderColor: style.borderColor,
            };
          },
        ),
      },
    },
    progress_message: { label: "Progress message", width: 260 },
    progress_numeric: { label: "Progress", width: 180 },
    attempts: { label: "Attempts", width: 100 },
    created_at: { label: "Queued", width: 160, renderAs: jobAgeFormat },
    started_at: { label: "Started", width: 160, renderAs: jobAgeFormat },
    finished_at: { label: "Finished", width: 160, renderAs: jobAgeFormat },
    duration: {
      label: "Duration",
      width: 140,
      renderAs: {
        type: "Stopwatch",
        params: { startColumn: "started_at", endColumn: "finished_at" },
      },
      computedConfig: {
        column: "finished_at",
        tsDataType: "any",
        udt_name: "interval",
        funcDef: {
          key: "$duration",
          label: "Duration",
          subLabel:
            "Duration of the latest attempt, excluding queue and retry waits",
        },
        args: { $duration: { otherColumn: "started_at" } },
      },
    },
    error: {
      label: "Error",
      width: 320,
      renderAs: { type: "JSON Summary", params: { path: ["message"] } },
    },
    output: {
      label: "Output",
      width: 140,
      renderAs: { type: "JSON Summary", params: { path: [] } },
    },
    target_table: { label: "Target table" },
    target_row_pkey: { label: "Target row" },
    params: { label: "Parameters" },
    user_id: { label: "User" },
    occurrence: { label: "Occurrence", renderAs: jobAgeFormat },
    reason: { label: "Reason" },
    max_attempts: { label: "Maximum attempts" },
    delay_ms: { label: "Retry delay (ms)" },
    backoff: { label: "Retry backoff" },
    cancel_requested: { label: "Cancellation requested" },
    checkpoint: { label: "Checkpoint" },
    has_checkpoint: { label: "Has checkpoint" },
    run_at: { label: "Run at", renderAs: jobAgeFormat },
    lease_token: { label: "Lease token" },
    locked_until: {
      label: "Locked until",
      renderAs: jobAgeFormat,
    },
    max_stalled_count: { label: "Maximum stalled attempts" },
    stalled_count: { label: "Stalled attempts" },
  } satisfies Partial<
    Record<
      keyof JobRecord | "duration",
      NonNullable<NonNullable<TableOptions["columns"]>[string]>
    >
  >,
};
