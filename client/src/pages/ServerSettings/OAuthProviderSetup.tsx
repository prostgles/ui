import { mdiLock } from "@mdi/js";
import { isDefined, isEqual } from "prostgles-types";
import React, { useState } from "react";
import { OAuthProviderOptions } from "@common/OAuthUtils";
import { CopyToClipboardBtn } from "@components/CopyToClipboardBtn";
import ErrorComponent from "@components/ErrorComponent";
import FormField from "@components/FormField/FormField";
import { Icon } from "@components/Icon/Icon";
import { FooterButtons } from "@components/Popup/FooterButtons";
import { Section } from "@components/Section";
import { SwitchToggle } from "@components/SwitchToggle";
import { t } from "../../i18n/i18nUtils";
import { tout } from "../ElectronSetup/ElectronSetup";
import {
  FacebookIcon,
  GithubIcon,
  GoogleIcon,
  MicrosoftIcon,
} from "../Login/SocialIcons";
import type { AuthProviderProps } from "./AuthProvidersSetup/useProviderProps";

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
  const setLocalAuth = (update: Partial<typeof auth>) => {
    if (!update) return _setLocalAuth(undefined);
    _setLocalAuth({
      ...(localAuth as any),
      clientID: localAuth?.clientID ?? "",
      clientSecret: localAuth?.clientSecret ?? "",
      ...update,
    });
  };
  const [error, setError] = useState<unknown>(undefined);
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
        onChange={(enabled) => {
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
            onChange={(displayName: string) => {
              void setLocalAuth({
                displayName,
              });
            }}
          />
          <FormField
            label={t.OAuthProviderSetup["Display Icon"]}
            value={localAuth?.displayIconPath}
            onChange={(displayIconPath: string) => {
              void setLocalAuth({
                displayIconPath,
              });
            }}
          />
          <FormField
            label={t.OAuthProviderSetup["Authorization URL"]}
            value={localAuth?.authorizationURL}
            onChange={(authorizationURL: string) => {
              void setLocalAuth({
                authorizationURL,
              });
            }}
          />
          <FormField
            label={t.OAuthProviderSetup["Token URL"]}
            value={localAuth?.tokenURL}
            onChange={(tokenURL: string) => {
              void setLocalAuth({
                tokenURL,
              });
            }}
          />
        </>
      )}
      <FormField
        label={t.OAuthProviderSetup["Client ID"]}
        value={localAuth?.clientID}
        onChange={(clientID: string) => {
          setLocalAuth({
            clientID,
          });
        }}
      />
      <FormField
        label={t.OAuthProviderSetup["Client Secret"]}
        value={localAuth?.clientSecret}
        onChange={(clientSecret: string) => {
          void setLocalAuth({
            clientSecret,
          });
        }}
      />
      <FormField
        label={t.OAuthProviderSetup.Scopes}
        fullOptions={PROVIDER_INFO[provider].scopes}
        multiSelect={true}
        value={localAuth?.authOpts?.scope}
        onChange={(scopes: string[]) => {
          console.log("scopes", scopes);
          void setLocalAuth({
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
        rightIcons={<CopyToClipboardBtn content={returnURL} />}
      />
      {isDefined(error) && <ErrorComponent error={error} />}
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
