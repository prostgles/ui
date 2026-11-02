import type { DBTableHandlersFromSchema } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import { isObject } from "prostgles-types";
import type { DatabaseConfigs } from "..";
import { getEmailClient } from "../authConfig/emailProvider/getEmailClient";
import type { EmailOutboxOptions } from "./EmailOutboxTypes";
import { getEmailOutboxDb } from "./getEmailOutboxTables";
import { getEmailSender } from "./sendEmail";

export const deliverOutboxEmail = async (
  dbo: DBTableHandlersFromSchema,
  id: string,
  options: EmailOutboxOptions,
  authProviders: DatabaseConfigs["auth_providers"],
  signal: AbortSignal,
) => {
  const { outbox } = getEmailOutboxDb(dbo, options);
  const email = await outbox.findOne({ id });
  if (!email) throw new Error("Outbox email not found");
  if (email.outcome !== "pending") {
    return { providerId: email.provider_id };
  }
  const sender =
    options.provider ?
      await getEmailSender(options.provider.smtp, options.provider.websiteUrl)
    : await getEmailClient(authProviders ?? undefined);
  if (!sender) {
    throw new Error("Configure an email provider before sending emails");
  }
  signal.throwIfAborted();
  const result = await sender.sendEmail({
    from: email.from,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    messageId: `<${email.id}@prostgles>`,
  });
  const providerId =
    isObject(result) && typeof result.messageId === "string" ?
      result.messageId
    : null;
  await outbox.update(
    { id },
    {
      outcome: "sent",
      provider_id: providerId,
      sent_at: new Date().toISOString(),
    },
  );
  return { providerId };
};
