import { isEqual } from "prostgles-client/dist/prostgles";
import React, { useState } from "react";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRowWrap } from "../../components/Flex";
import PopupMenu from "../../components/PopupMenu";
import type { AuthProvidersConfig } from "./AuthProvidersSetup";
import { EmailSMTPSetup } from "./EmailSMTPSetup";
import { EmailTemplateSetup } from "./EmailTemplateSetup";
import { fixIndent } from "../../demo/sqlVideoDemo";
import { SwitchToggle } from "../../components/SwitchToggle";
import type { DBS } from "../../dashboard/Dashboard/DBS";

type EmailConfig = Extract<NonNullable<AuthProvidersConfig["email"]>, { signupType: "withMagicLink" }>;
export type EmailSMTPCofig = EmailConfig["smtp"];
export type EmailTemplateCofig = EmailConfig["emailTemplate"];

type P = {
  value: AuthProvidersConfig["email"] | undefined;
  label: string;
  className?: string;
  dbs: DBS;
}
export const EmailSetup = ({ label, className, value, dbs }: P) => {
  const [error, setError] = useState<any>();

  const [emailTemplate, setEmailTemplate] = useState(value?.emailTemplate);
  const [smtp, setSMTP] = useState(value?.smtp);
  const didChange = emailTemplate && !isEqual(emailTemplate, value?.emailTemplate) ||
    smtp && !isEqual(smtp, value?.smtp);

  const { signupType, emailConfirmationEnabled } = value ?? {};
  const optional = signupType === "withPassword";

  const onChange = async (newValue: Pick<NonNullable<AuthProvidersConfig["email"]>, "signupType" | "emailConfirmationEnabled" | "smtp" | "emailTemplate">) => {
    try {
      const gs = await dbs.global_settings.findOne();
      if(!gs || !gs.auth_providers) throw new Error("Global settings not found");
      await dbs.global_settings.update(
        {}, 
        {
          auth_providers: {
            ...gs.auth_providers,
            email: newValue.signupType === "withMagicLink"? { 
              ...newValue, 
              emailTemplate, 
              smtp,
              emailConfirmationEnabled,
            } : {
              ...value, 
              emailTemplate, smtp, emailConfirmationEnabled
            }
          }
        }
      )
    } catch (error) {
      setError(error);
    }
  }

  const enabled = optional && emailConfirmationEnabled

  return <PopupMenu 
    positioning="center"
    title={label}
    button={
      <Btn
        variant="faded"
        color={enabled? "action" : undefined}
        label={{ label, variant: "normal", className: "mb-p5" }}
      >
        {enabled? "Enabled" : "Disabled"}
      </Btn>
    }
    className={className}
    clickCatchStyle={{ opacity: 1 }}
    render={pClose => 
      <FlexCol className="ai-start">
        {optional && 
          <SwitchToggle 
            label={"Require email verification"}
            checked={!!emailConfirmationEnabled}
            variant="col"
            onChange={checked => {
              onChange({ ...value, emailConfirmationEnabled: checked });
            }}
          />
        }
        <FlexRowWrap className="gap-2 ai-start">
          <EmailSMTPSetup
            value={smtp} 
            onChange={newSmtpValue => setSMTP(newSmtpValue)} 
          />
          <EmailTemplateSetup 
            value={emailTemplate}
            onChange={newEmailTemplate => setEmailTemplate(newEmailTemplate)}
            label="Email template"
          />
        </FlexRowWrap>
        {error && <ErrorComponent error={error} />}
      </FlexCol>
    }
    footerButtons={pClose => [
      { label: "Cancel", variant: "faded", onClickClose: true },
      { 
        label: "Save", color: "action", variant: "filled", 
        disabledInfo: didChange? undefined : "No changes",
        onClickPromise: async (e) => {
          if(!value) return;
          await onChange(value.signupType === "withMagicLink"? { 
              ...value, 
              emailTemplate, 
              smtp,
              emailConfirmationEnabled,
            } : {
              ...value, 
              emailTemplate, smtp, emailConfirmationEnabled
            })
            .then(() => pClose?.(e))
        } 
      },
    ]}
  />
}

const capitalisedHostname = window.location.hostname[0]?.toUpperCase() + window.location.hostname.slice(1);

export const DEFAULT_EMAIL_VERIFICATION_TEMPLATE = {
  from: `noreply@${window.location.hostname}.com`,
  subject: "Please verify your email address",
  body: fixIndent(`
    Hello,

    Somebody just used this email address to sign up at ${capitalisedHostname}.

    If this was you, verify your email by clicking on the link below:

    \${url}

    If this was not you, any other ${capitalisedHostname} accounts you may own, and your internet properties are not at risk.

    Thanks, The ${capitalisedHostname} Team`
  )
} satisfies EmailTemplateCofig;