import type { SMTPConfig } from "./EmailTypes";

export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

/** Retries and errors are recorded in each outbox row's linked managed job. */
export type EmailOutboxOptions = {
  /** Defaults to email_outbox. */
  tableName?: string;
  /** Defaults to email_templates. */
  templatesTableName?: string;
  /** Uses the connection's email auth provider when omitted. */
  provider?: { smtp: SMTPConfig; websiteUrl: string; from: string };
  /** Seeds missing templates; config reloads preserve edits made in the database. */
  templates?: Record<string, EmailTemplate>;
};

export type EmailOutboxInput = {
  from: string;
  to: string;
  userId?: string;
} & (EmailTemplate | { templateKey: string; values: Record<string, string> });
