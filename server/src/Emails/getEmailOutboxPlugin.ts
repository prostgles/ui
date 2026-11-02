import type { PluginDefinition } from "@src/Plugins/Plugins";
import type { ProstglesContext } from "@src/schemaConfig";
import { createJobDefiner } from "prostgles-server";
import type { DatabaseConfigs } from "..";
import { deliverOutboxEmail } from "./deliverOutboxEmail";
import type { EmailOutboxOptions } from "./EmailOutboxTypes";
import {
  getEmailOutboxTableNames,
  getEmailOutboxTables,
} from "./getEmailOutboxTables";

export const getEmailOutboxPlugin = (
  options: EmailOutboxOptions | undefined,
  authProviders: DatabaseConfigs["auth_providers"],
  jobsTableName: string,
  alertDeliveriesTableName: string | undefined,
  syncUsers: boolean,
): PluginDefinition | undefined => {
  if (!options) return;
  const names = getEmailOutboxTableNames(options);
  const tables = getEmailOutboxTables(
    options,
    jobsTableName,
    alertDeliveriesTableName,
    syncUsers,
  );
  const defineJob = createJobDefiner<void, ProstglesContext>();
  return {
    tableConfig: {
      [names.templates]: tables.templates,
      [names.outbox]: tables.outbox,
    },
    jobDefinitions: {
      __prostgles_emailDelivery: defineJob({
        trigger: {
          type: "row",
          table: names.outbox,
          on: ["insert"],
          jobIdColumn: "job_id",
          /* Alert emails retain their alert job, including its permission checks on retries. */
          when: { alert_delivery_id: null },
        },
        retry: { maxAttempts: 3, backoff: "exponential", delayMs: 1000 },
        concurrency: 4,
        run: async ({ dbo, row, signal }) => {
          await deliverOutboxEmail(
            dbo,
            row.id as string,
            options,
            authProviders,
            signal,
          );
        },
      }),
    },
  };
};
