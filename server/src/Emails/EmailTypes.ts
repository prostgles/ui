import type Mail from "nodemailer/lib/mailer";

export type SMTPConfig =
  | {
      type: "smtp";
      host: string;
      port: number;
      secure?: boolean;
      user: string;
      pass: string;
      tls?: TLSConfig;
    }
  | {
      type: "aws-ses";
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };

export type Email = {
  messageId?: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: string }[] | Mail.Attachment[];
};

type TLSConfig = {
  rejectUnauthorized?: boolean;
  servername?: string;
};
