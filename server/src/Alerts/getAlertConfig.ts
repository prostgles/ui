import type { AlertChannel, AlertsOptions } from "./AlertTypes";
import { isObject } from "prostgles-types";
import type { DBS, DatabaseConfigs } from "..";
import type { SchemaConfigAlerts } from "../schemaConfig";
import { getEmailSenderWithMockTest } from "../authConfig/emailProvider/getEmailSenderWithMockTest";

export const getAlertConfig = (
  alerts: SchemaConfigAlerts | undefined,
  dbs: DBS,
  authProviders: DatabaseConfigs["auth_providers"],
): AlertsOptions | undefined => {
  if (!alerts) return undefined;
  return {
    ...alerts,
    channels: Object.fromEntries(
      Object.entries(alerts.channels).map(([name, channel]) => {
        if (!("type" in channel)) return [name, channel];
        const emailChannel: AlertChannel = {
          send: async ({ recipientId, message, signal }) => {
            const recipient = await dbs.users.findOne({
              id: recipientId,
              status: "active",
            });
            if (!recipient?.email)
              throw new Error("Alert recipient has no active email address");
            const mailClient = await getEmailSenderWithMockTest(
              authProviders ?? undefined,
            );
            if (!mailClient || !authProviders?.email)
              throw new Error(
                "Configure an email provider before sending alerts",
              );
            signal.throwIfAborted();
            const result = await mailClient.sendEmail({
              to: recipient.email,
              from: channel.from ?? authProviders.email.emailTemplate.from,
              subject: message.title,
              text: message.body,
              html: `<pre>${message.body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>`,
            });
            return {
              providerId:
                isObject(result) && typeof result.messageId === "string" ?
                  result.messageId
                : null,
            };
          },
        };
        return [name, emailChannel];
      }),
    ),
  };
};
