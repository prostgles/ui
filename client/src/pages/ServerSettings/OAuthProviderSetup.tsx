import { mdiContentCopy } from "@mdi/js";
import { isEqual } from "prostgles-client/dist/prostgles";
import React, { useEffect, useState } from "react";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import FormField from "../../components/FormField/FormField";
import { FooterButtons } from "../../components/Popup/FooterButtons";
import { Section } from "../../components/Section";
import { SwitchToggle } from "../../components/SwitchToggle";
import {
  FacebookIcon,
  GithubIcon,
  GoogleIcon,
  MicrosoftIcon,
} from "../Login/SocialIcons";
import type { AuthProviderProps } from "./AuthProvidersSetup";
import { OAuthProviderOptions } from "../../../../commonTypes/OAuthUtils";
import { tout } from "../ElectronSetup";

type P = AuthProviderProps & {
  provider: keyof Omit<
    AuthProviderProps["authProviders"],
    "email" | "website_url" | "created_user_type"
  >;
};
export const OAuthProviderSetup = ({
  dbs,
  authProviders,
  disabledInfo,
  contentClassName,
  provider,
}: P) => {
  const returnURL = `${authProviders.website_url}/auth/${provider}/callback`;
  const auth = authProviders[provider];
  const [_localAuth, _setLocalAuth] = useState(auth);
  const localAuth = _localAuth ?? auth;
  const setLocalAuth = async (update: Partial<typeof auth>) => {
    if (!update) return _setLocalAuth(undefined);
    _setLocalAuth({
      ...(localAuth as any),
      clientID: localAuth?.clientID ?? "",
      clientSecret: localAuth?.clientSecret ?? "",
      ...update,
    });
  };
  const [error, setError] = useState<any>(undefined);
  const didChange = localAuth && !isEqual(localAuth, auth);
  const providerInfo = PROVIDER_INFO[provider];
  const { name, icon } = providerInfo;

  const msftAuthOpts =
    localAuth?.authOpts && "prompt" in localAuth.authOpts ?
      localAuth.authOpts
    : undefined;

  const doUpdate = async (newProviderConfig = localAuth) => {
    try {
      await dbs.global_settings.update(
        {},
        {
          auth_providers: {
            ...authProviders,
            [provider]: newProviderConfig,
          },
        },
      );
      await tout(500);
      setLocalAuth(undefined);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <Section
      title={name}
      titleIcon={icon}
      disabledInfo={disabledInfo}
      contentClassName={contentClassName}
      disableFullScreen={true}
      titleRightContent={
        <SwitchToggle
          className="ml-auto"
          disabledInfo={
            !authProviders[provider] ? "Must configure the provider first"
            : !localAuth ?
              "Must provide a client ID and secret"
            : undefined
          }
          checked={!!authProviders[provider]?.enabled}
          onChange={(checked) => {
            if (!localAuth) return;
            doUpdate({ ...localAuth, enabled: checked });
          }}
        />
      }
    >
      <SwitchToggle
        label={"Enabled"}
        checked={!!localAuth?.enabled}
        disabledInfo={
          !localAuth?.clientID &&
          !localAuth?.clientSecret &&
          "Must provide a client ID and secret"
        }
        onChange={async (enabled) => {
          setLocalAuth({
            enabled,
          });
        }}
      />
      <FormField
        label={"Client ID"}
        value={localAuth?.clientID}
        onChange={async (clientID) => {
          setLocalAuth({
            clientID,
          });
        }}
      />
      <FormField
        label={"Client Secret"}
        value={localAuth?.clientSecret}
        onChange={async (clientSecret) => {
          setLocalAuth({
            clientSecret,
          });
        }}
      />
      <FormField
        label={"Scopes"}
        fullOptions={PROVIDER_INFO[provider].scopes}
        multiSelect={true}
        value={localAuth?.authOpts?.scope}
        onChange={async (scopes) => {
          console.log("scopes", scopes);
          setLocalAuth({
            authOpts: {
              ...localAuth?.authOpts,
              scope: scopes,
            },
          });
        }}
      />
      {"prompts" in providerInfo && (
        <FormField
          label={"Prompt"}
          value={msftAuthOpts?.prompt}
          fullOptions={providerInfo.prompts}
          onChange={(prompt) =>
            setLocalAuth({
              authOpts: {
                ...msftAuthOpts,
                prompt,
              } as typeof msftAuthOpts,
            })
          }
          hint="Indicates the type of user interaction that is required."
        />
      )}
      <FormField
        label={"Return URL"}
        readOnly={true}
        value={returnURL}
        rightIcons={
          <Btn
            title="Copy to clipboard"
            iconPath={mdiContentCopy}
            onClick={() => {
              navigator.clipboard.writeText(returnURL);
            }}
          />
        }
      />
      {error && <ErrorComponent error={error} />}
      {didChange && (
        <FooterButtons
          footerButtons={[
            {
              label: "Save",
              color: "action",
              variant: "filled",
              onClickPromise: () => doUpdate(),
            },
          ]}
        />
      )}
    </Section>
  );
};

const PROVIDER_INFO = {
  google: {
    name: "Google",
    icon: <GoogleIcon />,
    scopes: OAuthProviderOptions.google.scopes,
  },
  facebook: {
    name: "Facebook",
    icon: <FacebookIcon />,
    scopes: OAuthProviderOptions.facebook.scopes,
  },
  github: {
    name: "GitHub",
    icon: <GithubIcon />,
    scopes: OAuthProviderOptions.github.scopes,
  },
  microsoft: {
    name: "Microsoft",
    icon: <MicrosoftIcon />,
    scopes: OAuthProviderOptions.microsoft.scopes,
    prompts: OAuthProviderOptions.microsoft.prompts,
  },
};
