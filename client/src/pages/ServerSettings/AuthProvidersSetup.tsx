import React, { useCallback, useEffect } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import Select from "../../components/Select/Select";
import { t } from "../../i18n/i18nUtils";
import { EmailAuthSetup } from "./EmailAuthSetup";
import { OAuthProviderSetup } from "./OAuthProviderSetup";

export type AuthProvidersConfig = Extract<
  DBSSchema["global_settings"]["auth_providers"],
  { website_url: string }
>;

type UseProviderPropsArgs = {
  dbs: Prgl["dbs"];
  dbsTables: Prgl["dbsTables"];
  auth_providers: DBSSchema["global_settings"]["auth_providers"] | undefined;
};
const useProviderProps = ({
  dbs,
  dbsTables,
  auth_providers,
}: UseProviderPropsArgs) => {
  const doUpdate = async (newValue: typeof auth_providers) => {
    await dbs.global_settings.update(
      {},
      {
        auth_providers: newValue,
      },
    );
  };

  const authProps = {
    authProviders: auth_providers ?? { website_url: "" },
    dbsTables,
    disabledInfo:
      !auth_providers?.website_url ? "Must setup website URL first" : undefined,
    contentClassName: "flex-col gap-2 p-2",
    doUpdate,
  };

  return authProps;
};

export type AuthProviderProps = ReturnType<typeof useProviderProps>;

export const AuthProviderSetup = ({
  dbs,
  dbsTables,
}: Pick<Prgl, "dbs" | "dbsTables">) => {
  const globalSettingsTable = dbsTables.find(
    (t) => t.name === "global_settings",
  );
  const authColumn = globalSettingsTable?.columns.find(
    (c) => c.name === "auth_providers",
  );
  const { data: global_settings } = dbs.global_settings.useSubscribeOne();
  const { data: userTypes } = dbs.user_types.useFind();
  const updateAuth = useCallback(
    async (auth: Partial<DBSSchema["global_settings"]["auth_providers"]>) => {
      await dbs.global_settings.update(
        {},
        {
          auth_providers:
            !auth ? undefined : (
              {
                website_url:
                  global_settings?.auth_providers?.website_url ??
                  window.location.origin,
                ...global_settings?.auth_providers,
                ...auth,
              }
            ),
        },
      );
    },
    [dbs.global_settings, global_settings],
  );

  const settingsLoaded = !!global_settings;
  const { website_url } = global_settings?.auth_providers ?? {};
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!website_url) {
      void updateAuth({
        website_url: window.location.origin,
      });
    }
  }, [updateAuth, settingsLoaded, website_url]);

  const authProps = useProviderProps({
    auth_providers: global_settings?.auth_providers,
    dbs,
    dbsTables,
  });

  if (!globalSettingsTable || !authColumn) {
    return (
      <InfoRow>
        Could not find global_settings table or authColumn. Make sure you have
        the correct permissions
      </InfoRow>
    );
  }

  if (!global_settings) {
    return <Loading />;
  }

  const { auth_providers } = global_settings;

  return (
    <FlexCol className="AuthProviderSetup f-1">
      <InfoRow className="mx-1" variant="naked" color="info" iconPath="">
        Manage user authentication methods, default user roles, and third-party
        login providers to control access.
      </InfoRow>
      <FlexCol className="p-1 gap-2">
        <FormField
          data-command="AuthProviderSetup.websiteURL"
          label={t.AuthProviderSetup["Website URL"]}
          hint={t.AuthProviderSetup["Used for redirect uri"]}
          value={global_settings.auth_providers?.website_url}
          onChange={async (website_url) => {
            updateAuth({
              ...auth_providers,
              website_url,
            });
          }}
        />
        <Select
          label={t.AuthProviderSetup["Default user type"]}
          data-command="AuthProviderSetup.defaultUserType"
          value={auth_providers?.created_user_type ?? "default"}
          fullOptions={
            userTypes?.map((ut) => ({
              key: ut.id,
              subLabel: ut.description ?? "",
            })) ?? []
          }
          onChange={async (default_user_type) => {
            if (default_user_type === "admin") {
              const result = window.confirm(
                t.AuthProviderSetup[
                  "Warning: You are setting the default user type to 'admin'. This means that new users will be granted the highest level of access!"
                ],
              );
              if (!result) return;
            }
            updateAuth({
              ...auth_providers,
              created_user_type: default_user_type || undefined,
            });
          }}
        />
        <InfoRow variant="naked" iconPath={""} color="info">
          {
            t.AuthProviderSetup[
              "The default user type assigned to new users. Defaults to 'default'"
            ]
          }
        </InfoRow>
        {auth_providers?.created_user_type === "admin" && (
          <InfoRow variant="filled" color="danger">
            {
              t.AuthProviderSetup[
                "Warning: You are setting the default user type to 'admin'. This means that new users will be granted the highest level of access!"
              ]
            }
          </InfoRow>
        )}
      </FlexCol>
      <FlexCol data-command="AuthProviders.list" className="gap-0">
        <EmailAuthSetup {...authProps} />
        <OAuthProviderSetup provider="google" {...authProps} />
        <OAuthProviderSetup provider="github" {...authProps} />
        <OAuthProviderSetup provider="microsoft" {...authProps} />
        <OAuthProviderSetup provider="facebook" {...authProps} />
        <OAuthProviderSetup provider="customOAuth" {...authProps} />
      </FlexCol>
    </FlexCol>
  );
};
