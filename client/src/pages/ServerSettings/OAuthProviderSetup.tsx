import { mdiContentCopy, mdiLock } from "@mdi/js";
import { isEqual } from "prostgles-types";
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
import { Icon } from "../../components/Icon/Icon";
import { t } from "../../i18n/i18nUtils";

type P = AuthProviderProps & {
  provider: keyof Omit<
    AuthProviderProps["authProviders"],
    "email" | "website_url" | "created_user_type"
  >;
};
export const OAuthProviderSetup = ({
  authProviders,
  disabledInfo,
  contentClassName,
  provider,
  doUpdate,
}: P) => {
  const returnURL = `${authProviders.website_url}/oauth/${provider}/callback`;
  const auth = authProviders[provider];
  const [_localAuth, _setLocalAuth] = useState(auth);
  const localAuth = _localAuth ?? auth;
  const isCustomOAuth = (
    localAuth: any,
  ): localAuth is typeof authProviders.customOAuth =>
    provider === "customOAuth";
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

  const onSave = async (newProviderConfig = localAuth) => {
    try {
      await doUpdate({
        ...authProviders,
        [provider]: newProviderConfig,
      });
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
            !authProviders[provider] ?
              t.OAuthProviderSetup["Must configure the provider first"]
            : !localAuth ?
              t.OAuthProviderSetup["Must provide a client ID and secret"]
            : undefined
          }
          checked={!!authProviders[provider]?.enabled}
          onChange={(checked) => {
            if (!localAuth) return;
            onSave({ ...localAuth, enabled: checked });
          }}
        />
      }
    >
      <SwitchToggle
        label={t.common.Enabled}
        checked={!!localAuth?.enabled}
        disabledInfo={
          !localAuth?.clientID &&
          !localAuth?.clientSecret &&
          t.OAuthProviderSetup["Must provide a client ID and secret"]
        }
        onChange={async (enabled) => {
          setLocalAuth({
            enabled,
          });
        }}
      />
      {isCustomOAuth(localAuth) && (
        <>
          <FormField
            label={t.OAuthProviderSetup["Display Name"]}
            value={localAuth?.displayName}
            onChange={async (displayName) => {
              setLocalAuth({
                displayName,
              });
            }}
          />
          <FormField
            label={t.OAuthProviderSetup["Display Icon"]}
            value={localAuth?.displayIconPath}
            onChange={async (displayIconPath) => {
              setLocalAuth({
                displayIconPath,
              });
            }}
          />
          <FormField
            label={t.OAuthProviderSetup["Authorization URL"]}
            value={localAuth?.authorizationURL}
            onChange={async (authorizationURL) => {
              setLocalAuth({
                authorizationURL,
              });
            }}
          />
          <FormField
            label={t.OAuthProviderSetup["Token URL"]}
            value={localAuth?.tokenURL}
            onChange={async (tokenURL) => {
              setLocalAuth({
                tokenURL,
              });
            }}
          />
        </>
      )}
      <FormField
        label={t.OAuthProviderSetup["Client ID"]}
        value={localAuth?.clientID}
        onChange={async (clientID) => {
          setLocalAuth({
            clientID,
          });
        }}
      />
      <FormField
        label={t.OAuthProviderSetup["Client Secret"]}
        value={localAuth?.clientSecret}
        onChange={async (clientSecret) => {
          setLocalAuth({
            clientSecret,
          });
        }}
      />
      <FormField
        label={t.OAuthProviderSetup.Scopes}
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
          label={t.OAuthProviderSetup.Prompt}
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
          hint={
            t.OAuthProviderSetup[
              "Indicates the type of user interaction that is required."
            ]
          }
        />
      )}
      <FormField
        label={t.OAuthProviderSetup["Return URL"]}
        readOnly={true}
        value={returnURL}
        rightIcons={
          <Btn
            title={t.common["Copy to clipboard"]}
            iconPath={mdiContentCopy}
            onClickPromise={async () => {
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
              label: t.common.Save,
              color: "action",
              variant: "filled",
              onClickPromise: () => onSave(),
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
  customOAuth: {
    name: "OAuth2",
    icon: <Icon path={mdiLock} />,
    scopes: OAuthProviderOptions.microsoft.scopes,
    prompts: OAuthProviderOptions.microsoft.prompts,
  },
};
