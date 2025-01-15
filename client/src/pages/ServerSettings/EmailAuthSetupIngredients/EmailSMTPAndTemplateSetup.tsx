import { mdiEmailEdit, mdiMailboxOpenOutline } from "@mdi/js";
import { pickKeys } from "prostgles-types";
import React from "react";
import {
  DEFAULT_EMAIL_VERIFICATION_TEMPLATE,
  DEFAULT_MAGIC_LINK_TEMPLATE,
  getMagicLinkEmailFromTemplate,
} from "../../../../../commonTypes/OAuthUtils";
import Btn from "../../../components/Btn";
import ErrorComponent from "../../../components/ErrorComponent";
import { FlexCol } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import { Section } from "../../../components/Section";
import type { AuthProvidersConfig } from "../AuthProvidersSetup";
import { useEditableData } from "../useEditableData";
import { EmailSMTPSetup } from "./EmailSMTPSetup";
import { EmailTemplateSetup } from "./EmailTemplateSetup";
import { t } from "../../../i18n/i18nUtils";

type EmailConfig = Extract<
  NonNullable<AuthProvidersConfig["email"]>,
  { signupType: "withMagicLink" }
>;
export type EmailSMTPCofig = EmailConfig["smtp"];
export type EmailTemplateCofig = EmailConfig["emailTemplate"];

const keysToUpdate = [
  "emailConfirmationEnabled",
  "smtp",
  "emailTemplate",
] as const;

type P = {
  websiteUrl: string;
  value: AuthProvidersConfig["email"] | undefined;
  label: string;
  className?: string;
  onChange: (
    newValue: Pick<
      NonNullable<AuthProvidersConfig["email"]>,
      "emailConfirmationEnabled" | "smtp" | "emailTemplate"
    >,
  ) => Promise<void>;
};
export const EmailSMTPAndTemplateSetup = (props: P) => {
  const { label, className, onChange, websiteUrl } = props;

  const { didChange, error, onSave, value, setValue, setError } =
    useEditableData(props.value && pickKeys(props.value, keysToUpdate.slice()));
  const { signupType } = props.value ?? {};
  const enabled = !!signupType;
  return (
    <PopupMenu
      positioning="top-center"
      title={label}
      data-command="EmailSMTPAndTemplateSetup"
      button={
        <Btn
          variant="faded"
          color={enabled ? "action" : undefined}
          label={{ label, variant: "normal", className: "mb-p5" }}
          disabledInfo={
            !signupType ? "Must select a Signup type first" : undefined
          }
        >
          {enabled ?
            t.EmailSMTPAndTemplateSetup["Configured"]
          : t.EmailSMTPAndTemplateSetup["Not configured"]}
        </Btn>
      }
      className={className}
      clickCatchStyle={{ opacity: 1 }}
      render={(pClose) => (
        <FlexCol className="ai-start">
          <p>
            {
              t.EmailSMTPAndTemplateSetup[
                "Users will receive an email with a link/code to verify their email address."
              ]
            }
          </p>
          <Section
            title={t.EmailSMTPAndTemplateSetup["Email Provider"]}
            titleIconPath={mdiMailboxOpenOutline}
            className={"w-full"}
            contentClassName="p-1"
            disableFullScreen={true}
          >
            <EmailSMTPSetup
              value={value?.smtp}
              onChange={(newSmtpValue) => setValue({ smtp: newSmtpValue })}
            />
          </Section>
          <Section
            title={t.EmailSMTPAndTemplateSetup["Template"]}
            titleIconPath={mdiEmailEdit}
            className={"w-full"}
            contentClassName="p-1"
            disableFullScreen={true}
          >
            <EmailTemplateSetup
              defaultBody={
                signupType === "withMagicLink" ?
                  DEFAULT_MAGIC_LINK_TEMPLATE.body
                : DEFAULT_EMAIL_VERIFICATION_TEMPLATE.body
              }
              parseBody={() => {
                return !value ? "" : (
                    getMagicLinkEmailFromTemplate({
                      code: "123456",
                      url: websiteUrl || "https://example.com",
                      template: value.emailTemplate,
                    }).body
                  );
              }}
              value={value?.emailTemplate}
              onChange={(newEmailTemplate) =>
                setValue({ emailTemplate: newEmailTemplate })
              }
            />
          </Section>
          {error && <ErrorComponent error={error} />}
        </FlexCol>
      )}
      footerButtons={(pClose) => [
        { label: t.common.Cancel, variant: "faded", onClickClose: true },
        {
          label: enabled ? t.common["Test and Save"] : t.common.Save,
          color: "action",
          variant: "filled",
          disabledInfo: didChange ? undefined : t.common["No changes"],
          onClickPromiseMessage: "Error",
          onClickPromise: async (e) => {
            if (!value) return setError("No value");
            if (!onSave) return setError("Nothing to save");
            await onSave(async () => {
              const newValue = { ...props.value, ...value };
              return onChange(newValue);
            });
            pClose?.(e);
          },
        },
      ]}
    />
  );
};

export const DEFAULT_SMTP_CONFIG = {
  type: "smtp",
  host: "",
  port: 465,
  secure: false,
  user: "",
  pass: "",
} satisfies EmailSMTPCofig;
