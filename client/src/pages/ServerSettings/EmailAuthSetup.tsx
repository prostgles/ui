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
import { EmailSMTPSetup } from "./EmailSMTPSetup";
import { InfoRow } from "../../components/InfoRow";

export const EmailAuthSetup = ({ dbs, authProviders, disabledInfo, contentClassName }: AuthProviderProps) => {
  
  const [_localAuth, setLocalAuth] = useState(authProviders.email);
  const localAuth = _localAuth ?? authProviders.email;
  const [error, setError] = useState<any>(undefined);
  const didChange = localAuth && !isEqual(localAuth, authProviders.email);

  return <Section 
    title="Email signup" 
    titleIconPath={mdiEmail}
    disabledInfo={disabledInfo}
    contentClassName={contentClassName}
  >
    <SwitchToggle 
      label={"Enabled"}
      checked={!!localAuth?.enabled}
      onChange={async (enabled) => {
        setLocalAuth(
          !localAuth? {
            enabled,
            signupType: "withPassword",
            emailConfirmation: {
              type: "aws-ses",
              accessKeyId: "",
              region: "",
              secretAccessKey: ""
            }
          } : {
            ...localAuth,
            enabled,
          },
        );
      }}
    />
    <Select 
      label={"Signup type"}
      value={localAuth?.signupType}
      fullOptions={[
        { 
          key: "withPassword", 
          label: "With password",
          subLabel: "A password will be required to login"
        },
        { 
          key: "withMagicLink", 
          label: "With magic link",
          subLabel: "Only email is required to login. A magic link will be sent to the user's email"
        },
      ] as const}
      onChange={async (signupType) => {
        setLocalAuth(
          signupType === "withPassword"? {
            ...localAuth,
            signupType,
            emailConfirmation: {
              type: "aws-ses",
              accessKeyId: "",
              region: "",
              secretAccessKey: ""
            }
          } : {
            ...localAuth,
            signupType,
            emailMagicLink: {
              type: "aws-ses",
              accessKeyId: "",
              region: "",
              secretAccessKey: ""
            }
          }
        );
      }}
    />
    {localAuth?.signupType === "withPassword" && 
      <FormField 
        label={"Minimum password length"}
        optional={true}
        value={localAuth.minPasswordLength ?? 8}
        onChange={async (minPasswordLength) => {
          setLocalAuth({
            ...localAuth,
            minPasswordLength
          });
        }}
        hint="Minimum password length. Defaults to 8"
      />
    }
    <InfoRow>
      {localAuth?.signupType === "withMagicLink"? 
        "Email settings below will be used to send the magic link to the registered user" :
        "If provided, the email settings below will be used to send a confirmation email to the registered user"
      }
    </InfoRow>
    <EmailSMTPSetup 
      label={localAuth?.signupType === "withMagicLink"? "Magic link mail setup" : "Email confirmation setup"}
      optional={localAuth?.signupType === "withPassword"}
      value={localAuth?.signupType === "withMagicLink"? localAuth.emailMagicLink : localAuth?.emailConfirmation}
      onChange={(smtpConfig) => {
        if(!localAuth) return;
        setLocalAuth({
          ...localAuth,
          [localAuth.signupType === "withMagicLink"? "emailMagicLink" : "emailConfirmation"]: smtpConfig
        });
        setError(undefined);
      }}
    />
    {error && 
      <ErrorComponent error={error} />
    }
    {didChange && <FooterButtons 
      footerButtons={[
        { 
          label: "Save", 
          color: "action",
          variant: "filled",
          onClick: async () => {
            try {
              await dbs.global_settings.update(
                {},
                { 
                  auth_providers: {
                    ...authProviders,
                    email: localAuth
                  }
                }
              );
              setLocalAuth(undefined);
            } catch(err) {
              setError(err);
            }
          } 
        },
      ]}
    />}
  </Section>
}