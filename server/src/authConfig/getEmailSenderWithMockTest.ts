import type { Email } from "prostgles-server/dist/Auth/AuthTypes";
import { getEmailSender } from "prostgles-server/dist/Prostgles";
import {
  getMagicLinkEmailFromTemplate,
  getVerificationEmailFromTemplate,
  MOCK_SMTP_HOST,
} from "../../../commonTypes/OAuthUtils";
import type { DBSSchema } from "../../../commonTypes/publishUtils";

export const getSMTPWithTLS = (
  smtp: NonNullable<
    NonNullable<DBSSchema["global_settings"]["auth_providers"]>["email"]
  >["smtp"],
) => {
  return {
    ...smtp,
    ...(smtp.type === "smtp" &&
      smtp.rejectUnauthorized !== undefined && {
        tls: { rejectUnauthorized: smtp.rejectUnauthorized },
      }),
  };
};

export const getEmailSenderWithMockTest = async (
  auth_providers: DBSSchema["global_settings"]["auth_providers"] | undefined,
) => {
  const { email, website_url } = auth_providers ?? {};
  if (!email || !website_url) return undefined;
  const { smtp: smtpWithoutTLS, emailTemplate } = email;
  const smtp = getSMTPWithTLS(smtpWithoutTLS);
  let sendEmail:
    | Awaited<ReturnType<typeof getEmailSender>>["sendEmail"]
    | undefined;
  if (smtp.type === "smtp" && smtp.host === MOCK_SMTP_HOST) {
    sendEmail = async (_email: Email) => {
      console.log("Mock email sent", _email);
    };
  } else {
    ({ sendEmail } = await getEmailSender(smtp, website_url));
  }
  return {
    sendEmail,
    sendEmailVerification: ({ to, code, verificationUrl }: EmailData) => {
      const verificationEmail = getVerificationEmailFromTemplate({
        code,
        url: verificationUrl,
        template: emailTemplate,
      });
      return sendEmail({
        to,
        from: emailTemplate.from,
        subject: verificationEmail.subject,
        html: verificationEmail.body,
      });
    },
    sendMagicLinkEmail: ({ to, url }: { to: string; url: string }) => {
      const magicLinkEmail = getMagicLinkEmailFromTemplate({
        template: emailTemplate,
        url,
      });
      return sendEmail({
        to,
        from: emailTemplate.from,
        subject: magicLinkEmail.subject,
        html: magicLinkEmail.body,
      });
    },
  };
};

type EmailData = {
  code: string;
  to: string;
  verificationUrl: string;
};
