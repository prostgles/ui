import type { AlertChannel, AlertsOptions } from "./AlertTypes";
import type { DBS, DatabaseConfigs } from "..";
import type { SchemaConfigAlerts } from "../schemaConfig";
import { deliverOutboxEmail } from "../Emails/deliverOutboxEmail";
import type { EmailOutboxOptions } from "../Emails/EmailOutboxTypes";
import { getEmailOutboxDb } from "../Emails/getEmailOutboxTables";
import { renderOutboxEmail } from "../Emails/renderOutboxEmail";

export const getAlertConfig = (
  alerts: SchemaConfigAlerts | undefined,
  dbs: DBS,
  authProviders: DatabaseConfigs["auth_providers"],
  emailOutbox: EmailOutboxOptions | undefined,
  connectionId: string,
): AlertsOptions | undefined => {
  if (!alerts) return undefined;
  return {
    ...alerts,
    channels: Object.fromEntries(
      Object.entries(alerts.channels).map(([name, channel]) => {
        if (!("type" in channel)) return [name, channel];
        if (channel.type === "inApp") {
          return [
            name,
            {
              send: async ({ recipientId, message, idempotencyKey, signal }) => {
                signal.throwIfAborted();
                await dbs.alerts.insert(
                  {
                    connection_id: connectionId,
                    user_id: recipientId,
                    delivery_id: idempotencyKey,
                    title: message.title,
                    message: message.body,
                    severity: "info",
                  },
                  { onConflict: "DoNothing" },
                );
                return { providerId: idempotencyKey };
              },
            } satisfies AlertChannel,
          ];
        }
        const emailChannel: AlertChannel = {
          send: async ({
            dbo,
            jobId,
            recipientId,
            message,
            idempotencyKey,
            signal,
          }) => {
            if (!emailOutbox) throw new Error("Email outbox is not configured");
            const { outbox } = getEmailOutboxDb(dbo, emailOutbox);
            const recipient = await dbs.users.findOne({
              id: recipientId,
              status: "active",
            });
            if (!recipient?.email) {
              throw new Error("Alert recipient has no active email address");
            }
            const from =
              channel.from ??
              emailOutbox.provider?.from ??
              authProviders?.email?.emailTemplate.from;
            if (!from)
              throw new Error(
                "Configure an email sender before sending alerts",
              );
            const rendered = await renderOutboxEmail(
              dbo,
              {
                to: recipient.email,
                from,
                userId: recipientId,
                templateKey: channel.templateKey ?? "alert",
                values: { title: message.title, body: message.body },
              },
              emailOutbox,
            );
            signal.throwIfAborted();
            await outbox.insert(
              {
                ...rendered,
                outcome: "pending",
                alert_delivery_id: idempotencyKey,
                job_id: jobId,
              },
              { onConflict: "DoNothing" },
            );
            /* Rebuild pending content from the recipient's current permissions on each attempt. */
            await outbox.update(
              { alert_delivery_id: idempotencyKey, outcome: "pending" },
              {
                ...rendered,
                job_id: jobId,
              },
            );
            const email = await outbox.findOne({
              alert_delivery_id: idempotencyKey,
            });
            if (!email) throw new Error("Alert email was not queued");
            return deliverOutboxEmail(
              dbo,
              email.id,
              emailOutbox,
              authProviders,
              signal,
            );
          },
        };
        return [name, emailChannel];
      }),
    ),
  };
};
