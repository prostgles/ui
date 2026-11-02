import type { Email, SMTPConfig } from "./EmailTypes";
import * as nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type SESTransport from "nodemailer/lib/ses-transport";
import { checkDmarc } from "./checkDmarc";

type SESTransporter = nodemailer.Transporter<
  SESTransport.SentMessageInfo,
  SESTransport.Options
>;
type SMTPTransporter = nodemailer.Transporter<
  nodemailer.SentMessageInfo,
  nodemailer.TransportOptions
>;
type Transporter = SESTransporter | SMTPTransporter;

const transporterCache: Map<string, Transporter> = new Map();

/**
 * Allows sending emails using nodemailer default config or AWS SES
 * https://www.nodemailer.com/transports/ses/
 */
const sendEmail = (smtpConfig: SMTPConfig, email: Email) => {
  const transporter = getOrSetTransporter(smtpConfig);
  return send(transporter, email);
};

/**
 * Verifies DMARC and that the website has a valid DMARC records
 */
const emailSenderCache: Map<string, boolean> = new Map();
export const getEmailSender = async (
  smtpConfig: SMTPConfig,
  websiteUrl: string,
) => {
  const result = {
    sendEmail: (email: Email) => sendEmail(smtpConfig, email),
  };
  const configStr = JSON.stringify({ smtpConfig, websiteUrl });
  if (emailSenderCache.has(configStr)) {
    return result;
  }
  if (!websiteUrl) {
    throw new Error("websiteUrl is required for checking DMARC");
  }
  await checkDmarc(websiteUrl);

  await verifySMTPConfig(smtpConfig);

  /**
   * Setup nodemailer transporters
   */
  getOrSetTransporter(smtpConfig);
  emailSenderCache.set(configStr, true);
  return result;
};

/**
 * Returns a transporter from cache or creates a new one
 */
const getOrSetTransporter = (smtpConfig: SMTPConfig) => {
  const configStr = JSON.stringify(smtpConfig);
  const transporter =
    transporterCache.get(configStr) ?? getTransporter(smtpConfig);
  if (!transporterCache.has(configStr)) {
    transporterCache.set(configStr, transporter);
  }
  return transporter;
};

const getTransporter = (smtpConfig: SMTPConfig) => {
  let transporter: Transporter | undefined;
  if (smtpConfig.type === "aws-ses") {
    const { region, accessKeyId, secretAccessKey } = smtpConfig;
    const sesClient = new SESv2Client({
      apiVersion: "2010-12-01",
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    transporter = nodemailer.createTransport({
      SES: {
        sesClient,
        SendEmailCommand,
      },
    });
  } else {
    const { user, pass, host, port, secure, tls } = smtpConfig;
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls,
    });
  }

  return transporter;
};

const send = (transporter: Transporter, email: Email) => {
  return new Promise((resolve, reject) => {
    const doSend = () => {
      transporter.sendMail(email, (err, info) => {
        if (err) {
          reject(err);
        } else {
          resolve(info);
        }
      });
    };
    /**
     * Local transporters used in testing ("smtp-server") don't have isIdle method
     */
    if (
      transporter.isIdle() ||
      !("isIdle" in transporter.transporter && transporter.transporter.isIdle)
    ) {
      doSend();
    } else {
      transporter.once("idle", doSend);
    }
  });
};

export const verifySMTPConfig = async (smtpConfig: SMTPConfig) => {
  const transporter = getOrSetTransporter(smtpConfig);
  return new Promise((resolve, reject) => {
    transporter.verify((err, success) => {
      if (err) {
        reject(err);
      } else {
        resolve(success);
      }
    });
  });
};
