import type { PluginDefinition } from "@src/Plugins/Plugins";
import { createJobDefiner, type JobsOptions } from "prostgles-server";
import { parseCronSchedule } from "prostgles-server/dist/Jobs/cronSchedule";
import { connectionManager } from "..";
import type { ProstglesContext } from "../schemaConfig";
import type { AlertsOptions } from "./AlertTypes";
import { enqueueAlerts } from "./enqueueAlerts";
import {
  getAlertTableNames,
  getAlertTables,
  type AlertSchema,
} from "./getAlertTables";
import { runAlertDelivery } from "./runAlertDelivery";

export const getAlertsPlugin = (
  connectionId: string,
  options: AlertsOptions | undefined,
  jobsTableName: string,
): PluginDefinition | undefined => {
  if (!options) return;
  if (
    !Object.keys(options.types).length ||
    !Object.keys(options.channels).length
  ) {
    throw new Error("alerts requires at least one type and channel");
  }
  const names = getAlertTableNames(options);
  const tables = getAlertTables(options, jobsTableName);

  const defineJob = createJobDefiner<void, ProstglesContext>();
  const jobDefinitions = {
    __prostgles_alertSchedule: defineJob({
      trigger: { type: "schedule", cron: "* * * * * *" },
      onConflict: "skip",
      run: ({ dbo }) => enqueueAlerts(dbo, options),
    }),
    __prostgles_alertDelivery: defineJob({
      trigger: {
        type: "row",
        table: names.deliveries,
        on: ["insert"],
        jobIdColumn: "job_id",
      },
      retry: { maxAttempts: 3, backoff: "exponential", delayMs: 1000 },
      concurrency: 4,
      run: ({ dbo, row, signal }) =>
        runAlertDelivery(
          dbo,
          options,
          (request, scope) =>
            connectionManager
              .getActiveConnection(connectionId)
              .prgl.getClientDBHandlers(request, scope),
          row as Required<AlertSchema["deliveries"]["columns"]>,
          signal,
        ),
    }),
  } satisfies JobsOptions<void, ProstglesContext>["definitions"];

  return {
    tableConfig: {
      [names.alerts]: tables.alerts,
      [names.recipients]: tables.recipients,
      [names.deliveries]: {
        ...tables.deliveries,
        publish: { insert: false, update: false, delete: false },
      },
    },
    tableHooks: {
      [names.alerts]: {
        beforeEach: [
          {
            commands: { insert: 1, update: 1 },
            validate: ({ data }) => {
              if (data.schedule)
                parseCronSchedule({
                  type: "schedule",
                  ...(data.schedule as AlertSchema["alerts"]["columns"]["schedule"]),
                });
            },
          },
        ],
      },
    },
    jobDefinitions,
  };
};
