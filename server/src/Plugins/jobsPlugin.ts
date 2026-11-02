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
    "finished_at",
    "error",
  ] satisfies (keyof JobRecord)[],
  sort: [{ key: "created_at", asc: false }],
  referenceDisplay: { columns: [{ name: "status" }] },
  card: { headerColumn: "job_name", subHeaderColumn: "status" },
  columns: {
    job_name: { label: "Job", width: 220, infoLevel: 1 },
    status: {
      width: 120,
      infoLevel: 1,
      style: {
        type: "Conditional",
        conditions: Object.entries(jobStatusColors).map(
          ([condition, color]) => {
            const style = CHIP_COLOR_NAMES[color]!;
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
    progress_message: { label: "Progress message", width: 260, infoLevel: 1 },
    progress_numeric: { label: "Progress", infoLevel: 1 },
    attempts: { infoLevel: 1 },
    created_at: { renderAs: { type: "Age" }, infoLevel: 1 },
    finished_at: { renderAs: { type: "Age" }, infoLevel: 1 },
    error: { width: 320, infoLevel: 1 },
    id: { infoLevel: 2 },
    target_table: { label: "Target table", infoLevel: 2 },
    target_row_pkey: { label: "Target row", infoLevel: 2 },
    params: { label: "Parameters", infoLevel: 2 },
    user_id: { label: "User", infoLevel: 2 },
    occurrence: { renderAs: { type: "Age" }, infoLevel: 2 },
    reason: { infoLevel: 2 },
    max_attempts: { label: "Maximum attempts", infoLevel: 2 },
    delay_ms: { label: "Retry delay (ms)", infoLevel: 2 },
    backoff: { label: "Retry backoff", infoLevel: 2 },
    cancel_requested: { label: "Cancellation requested", infoLevel: 2 },
    checkpoint: { infoLevel: 2 },
    has_checkpoint: { label: "Has checkpoint", infoLevel: 2 },
    run_at: { label: "Run at", renderAs: { type: "Age" }, infoLevel: 2 },
    lease_token: { label: "Lease token", infoLevel: 2 },
    locked_until: {
      label: "Locked until",
      renderAs: { type: "Age" },
      infoLevel: 2,
    },
  } satisfies Record<
    keyof JobRecord,
    NonNullable<NonNullable<TableOptions["columns"]>[string]>
  >,
};
