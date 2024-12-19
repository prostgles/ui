import { mdiEmail, mdiEmailEdit, mdiMailboxOpenOutline } from "@mdi/js";
import React from "react";
import Btn from "../../../components/Btn";
import ErrorComponent from "../../../components/ErrorComponent";
import { FlexCol } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import { Section } from "../../../components/Section";
import { SwitchToggle } from "../../../components/SwitchToggle";
import { fixIndent } from "../../../demo/sqlVideoDemo";
import { pickKeys } from "../../../utils";
import type { AuthProvidersConfig } from "../AuthProvidersSetup";
import { useEditableData } from "../useEditableData";
import { EmailSMTPSetup } from "./EmailSMTPSetup";
import { EmailTemplateSetup } from "./EmailTemplateSetup";

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
  const { label, className, onChange } = props;

  const { didChange, error, onSave, value, setValue } = useEditableData(
    props.value && pickKeys(props.value, keysToUpdate.slice()),
  );
  const { signupType } = props.value ?? {};
  const showConfirmationEnableToggle = signupType === "withPassword";

  const enabled =
    showConfirmationEnableToggle && value?.emailConfirmationEnabled;
  return (
    <PopupMenu
      positioning="top-center"
      title={label}
      button={
        <Btn
          variant="faded"
          color={enabled ? "action" : undefined}
          label={{ label, variant: "normal", className: "mb-p5" }}
        >
          {enabled ? "Enabled" : "Disabled"}
        </Btn>
      }
      className={className}
      clickCatchStyle={{ opacity: 1 }}
      render={(pClose) => (
        <FlexCol className="ai-start">
          {showConfirmationEnableToggle && (
            <FlexCol>
              <p>
                Require email confirmation for new users. Users will receive an
                email with a link to verify their email address.
              </p>
              <SwitchToggle
                label={"Email confirmation"}
                checked={!!value?.emailConfirmationEnabled}
                variant="col"
                onChange={(checked) => {
                  setValue({
                    emailConfirmationEnabled: checked,
                  });
                }}
              />
            </FlexCol>
          )}
          <FlexCol
            disabledInfo={
              showConfirmationEnableToggle &&
              !enabled &&
              "Email verification must be enabled to edit"
            }
            className={`f-1 w-full gap-2 ai-start bg-color-0 ${
              showConfirmationEnableToggle && !enabled ? "hidden" : ""
            }`}
          >
            <Section
              title={"Email Provider"}
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
              title={"Template"}
              titleIconPath={mdiEmailEdit}
              className={"w-full"}
              contentClassName="p-1"
              disableFullScreen={true}
            >
              <EmailTemplateSetup
                // label="Email template"
                label=""
                value={value?.emailTemplate}
                onChange={(newEmailTemplate) =>
                  setValue({ emailTemplate: newEmailTemplate })
                }
              />
            </Section>
          </FlexCol>
          {error && <ErrorComponent error={error} />}
        </FlexCol>
      )}
      footerButtons={(pClose) => [
        { label: "Cancel", variant: "faded", onClickClose: true },
        {
          label: enabled ? "Test and Save" : "Save",
          color: "action",
          variant: "filled",
          disabledInfo: didChange ? undefined : "No changes",
          onClickPromiseMessage: "Error",
          onClickPromise: async (e) => {
            if (!value) throw new Error("No value");
            if (!onSave) throw new Error("Nothing to save");
            await onSave(() => onChange({ ...props.value, ...value }));
            pClose?.(e);
          },
        },
      ]}
    />
  );
};

const capitalisedHostname =
  window.location.hostname[0]?.toUpperCase() +
  window.location.hostname.slice(1);

export const DEFAULT_EMAIL_VERIFICATION_TEMPLATE = {
  from: `noreply@${window.location.hostname}.com`,
  subject: "Please verify your email address",
  body: fixIndent(`
    Hello,

    Somebody just used this email address to sign up at ${capitalisedHostname}.

    If this was you, verify your email by clicking on the link below:

    \${url}

    If this was not you, any other ${capitalisedHostname} accounts you may own, and your internet properties are not at risk.

    Thanks, The ${capitalisedHostname} Team`),
} satisfies EmailTemplateCofig;
