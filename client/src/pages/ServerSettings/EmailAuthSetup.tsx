import { mdiEmail } from "@mdi/js";
import { isEqual } from "prostgles-client/dist/prostgles";
import React, { useState } from "react";
import ErrorComponent from "../../components/ErrorComponent";
import FormField from "../../components/FormField/FormField";
import { FooterButtons } from "../../components/Popup/FooterButtons";
import { Section } from "../../components/Section";
import Select from "../../components/Select/Select";
import { SwitchToggle } from "../../components/SwitchToggle";
import type { AuthProviderProps } from "./AuthProvidersSetup";
import {
  DEFAULT_EMAIL_VERIFICATION_TEMPLATE,
  EmailSMTPAndTemplateSetup,
} from "./EmailSMTPAndTemplateSetup";

export const EmailAuthSetup = ({
  authProviders,
  disabledInfo,
  contentClassName,
  doUpdate,
}: AuthProviderProps) => {
  const [_localAuth, setLocalAuth] = useState(authProviders.email);
  const localAuth = _localAuth ?? authProviders.email;
  const [error, setError] = useState<any>(undefined);
  const didChange = localAuth && !isEqual(localAuth, authProviders.email);

  const onToggle =
    !localAuth ? undefined : (
      async (enabled: boolean) => {
        await doUpdate({
          ...authProviders,
          email: {
            ...localAuth,
            enabled,
          },
        }).catch(setError);
        setLocalAuth(undefined);
      }
    );

  return (
    <Section
      title="Email signup"
      titleIconPath={mdiEmail}
      disabledInfo={disabledInfo}
      contentClassName={contentClassName}
      disableFullScreen={true}
      titleRightContent={
        <SwitchToggle
          className="ml-auto"
          checked={!!authProviders.email?.enabled}
          disabledInfo={!onToggle && "Must configure the email provider first"}
          onChange={onToggle ?? (() => {})}
        />
      }
    >
      <SwitchToggle
        label={"Enabled"}
        checked={!!localAuth?.enabled}
        onChange={async (enabled) => {
          setLocalAuth(
            !localAuth ?
              {
                enabled,
                signupType: "withPassword",
              }
            : {
                ...localAuth,
                enabled,
              },
          );
        }}
      />
      <Select
        label={"Signup type"}
        showSelectedSublabel={true}
        value={localAuth?.signupType}
        fullOptions={
          [
            {
              key: "withPassword",
              label: "With password",
              subLabel: "A password will be required to login",
            },
            {
              key: "withMagicLink",
              label: "With magic link",
              subLabel:
                "Only email is required to login. A magic link will be sent to the user's email",
            },
          ] as const
        }
        onChange={async (signupType) => {
          setLocalAuth({
            ...localAuth,
            signupType,
            emailTemplate: DEFAULT_EMAIL_VERIFICATION_TEMPLATE,
          });
        }}
      />
      {localAuth?.signupType === "withPassword" && (
        <FormField
          label={"Minimum password length"}
          optional={true}
          value={localAuth.minPasswordLength ?? 8}
          onChange={async (minPasswordLength) => {
            setLocalAuth({
              ...localAuth,
              minPasswordLength,
            });
          }}
          hint="Minimum password length. Defaults to 8"
        />
      )}
      <EmailSMTPAndTemplateSetup
        label={
          localAuth?.signupType === "withMagicLink" ?
            "Magic link email"
          : "Email verification"
        }
        value={localAuth}
        onChange={async (newConfig) => {
          if (!localAuth) throw "Local auth not found";
          if (localAuth.signupType !== "withPassword" && !newConfig.smtp) {
            throw "Please enable the email provider first";
          }
          await doUpdate({
            ...authProviders,
            email: {
              ...localAuth,
              ...newConfig,
            },
          });
          setError(undefined);
          setLocalAuth(undefined);
        }}
      />
      {error && <ErrorComponent error={error} />}
      {didChange && (
        <FooterButtons
          footerButtons={[
            {
              label: "Save",
              color: "action",
              variant: "filled",
              onClick: async () => {
                try {
                  await doUpdate({
                    ...authProviders,
                    email: localAuth,
                  });
                  setError(undefined);
                  setLocalAuth(undefined);
                } catch (err) {
                  setError(err);
                }
              },
            },
          ]}
        />
      )}
    </Section>
  );
};
