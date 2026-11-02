import type { PluginDefinition } from "@src/Plugins/Plugins";
import { defineFunction, type GetClientDBHandlers } from "prostgles-server";
import type { JSONB } from "prostgles-types";
import type { DBS } from "..";
import type { AlertsOptions } from "./AlertTypes";
import { getAlertDb, getAlertTableNames } from "./getAlertTables";
import { getAlertRecipients } from "./getAlertRecipients";
import { prepareAlert } from "./prepareAlert";

export const getAlertFunctions = (
  options: AlertsOptions,
  dbs: DBS,
  syncUsers: boolean,
  getClientDBHandlers: GetClientDBHandlers,
): NonNullable<PluginDefinition["functions"]> => {
  const names = getAlertTableNames(options);
  const alertInput = {
    type: "ValueLookup",
    table: names.alerts,
    column: "id",
    title: "Alert",
  } as const satisfies JSONB.ValueLookup;
  const recipientInput = {
    recipientId: {
      type: "ValueLookup",
      table: "users",
      column: "id",
      filter: { status: "active" },
      optional: true,
      title: "Preview as",
      description:
        "Defaults to your user. Uses the selected user's permissions.",
    },
  } as const satisfies Record<string, JSONB.FieldType>;
  return {
    __prostgles_alerts: {
      userFilter: { type: "admin" },
      functions: {
        previewAlert: defineFunction({
          unrestrictedDbAccess: true,
          description:
            "Preview the saved alert without sending or suppressing deliveries.",
          input: {
            alertId: {
              ...alertInput,
              showInRowCard: { actionLabel: "Preview" },
            },
            ...(syncUsers ? recipientInput : {}),
          },
          run: async ({ alertId, recipientId }, { dbo, user }) => {
            const alert = await getAlertDb(dbo, options).alerts.findOne({
              id: alertId,
            });
            if (!alert) throw new Error("Alert not found");
            const previewUserId: string = recipientId ?? user.id;
            const [recipient] = await getAlertRecipients(
              dbs,
              dbo,
              { id: previewUserId },
              syncUsers,
            );
            if (!recipient) throw new Error("Alert recipient is not active");
            return (
              (await prepareAlert({
                options,
                alert,
                recipientId: recipient.id,
                getClientDBHandlers,
                signal: AbortSignal.timeout(30_000),
                filterRows: (rows) => Promise.resolve(rows),
              })) ?? { reason: "No matching items to notify" }
            );
          },
        }),
        sendTestAlert: defineFunction({
          unrestrictedDbAccess: true,
          description:
            "Send the saved alert only to yourself, including when disabled. Test sends ignore schedules and deduplication.",
          input: {
            alertId: {
              ...alertInput,
              showInRowCard: { actionLabel: "Send test" },
            },
            channel: {
              type: "ValueLookup",
              table: names.channels,
              column: "id",
              title: "Channel",
            },
          },
          run: async ({ alertId, channel }, { dbo, user }) => {
            const { alerts, deliveries } = getAlertDb(dbo, options);
            const alert = await alerts.findOne({ id: alertId });
            if (!alert) throw new Error("Alert not found");
            if (!alert.channels.includes(channel))
              throw new Error("Channel is not enabled for this alert");
            const [recipient] = await getAlertRecipients(
              dbs,
              dbo,
              { id: user.id },
              syncUsers,
            );
            if (!recipient) throw new Error("Alert recipient is not active");
            const message = await prepareAlert({
              options,
              alert,
              recipientId: recipient.id,
              getClientDBHandlers,
              signal: AbortSignal.timeout(30_000),
              filterRows: (rows) => Promise.resolve(rows),
            });
            if (!message) {
              throw new Error(
                "Cannot send test alert: no matching items to notify",
              );
            }
            const delivery = await deliveries.insert(
              {
                alert_id: alert.id,
                user_id: recipient.id,
                channel,
                occurrence: new Date().toISOString(),
                definition: alert.definition,
                revision: alert.revision,
                is_test: true,
                outcome: "pending",
              },
              { returning: "*" },
            );
            return { deliveryId: delivery.id, jobId: delivery.job_id };
          },
        }),
      },
    },
  };
};
