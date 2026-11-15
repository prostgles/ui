import type { DBTableHandlersFromSchema } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { EmailOutboxInput, EmailOutboxOptions } from "./EmailOutboxTypes";
import { getEmailOutboxDb } from "./getEmailOutboxTables";
import { renderEmailText } from "./renderEmailText";

export const renderOutboxEmail = async (
  dbo: DBTableHandlersFromSchema,
  email: EmailOutboxInput,
  options: EmailOutboxOptions,
) => {
  const envelope = {
    from: email.from,
    to: email.to,
    user_id: email.userId ?? null,
  };
  if (!("templateKey" in email)) {
    return {
      ...envelope,
      subject: email.subject,
      text: email.text,
      html: email.html,
      template_key: null,
      template_revision: null,
    };
  }
  const template = await getEmailOutboxDb(dbo, options).templates.findOne({
    key: email.templateKey,
  });
  if (!template) {
    throw new Error(`Email template not found: ${email.templateKey}`);
  }
  return {
    ...envelope,
    subject: renderEmailText(template.subject, email.values),
    text: renderEmailText(template.text, email.values),
    html: renderEmailText(template.html, email.values, true),
    template_key: template.key,
    template_revision: template.revision,
  };
};

