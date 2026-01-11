import type { DBSSchema } from "@common/publishUtils";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import React, { useCallback, useEffect } from "react";
import type { Prgl } from "../../../App";
import { t } from "../../../i18n/i18nUtils";
import { EmailAuthSetup } from "../EmailAuthSetup";
import { OAuthProviderSetup } from "../OAuthProviderSetup";
import { useProviderProps } from "./useProviderProps";

export type AuthProvidersConfig = Extract<
  DBSSchema["database_configs"]["auth_providers"],
  { website_url: string }
>;

export const AuthProviderSetup = ({
  dbs,
  dbsTables,
  connection_id,
}: Pick<Prgl, "dbs" | "dbsTables"> & {
  connection_id: string;
}) => {
  const databaseConfigTable = dbsTables.find(
    (t) => t.name === "database_configs",
  );
  const authColumn = databaseConfigTable?.columns.find(
    (c) => c.name === "auth_providers",
  );
  const { data: database_config } = dbs.database_configs.useSubscribeOne();
  const { data: userTypes } = dbs.user_types.useFind();
  const updateAuth = useCallback(
    async (auth: Partial<DBSSchema["database_configs"]["auth_providers"]>) => {
      await dbs.database_configs.update(
        {},
        {
          auth_providers:
            !auth ? undefined : (
              {
                website_url:
                  database_config?.auth_providers?.website_url ??
                  window.location.origin,
                ...database_config?.auth_providers,
                ...auth,
              }
            ),
        },
      );
    },
    [dbs.database_configs, database_config],
  );

  const settingsLoaded = !!database_config;
  const { website_url } = database_config?.auth_providers ?? {};
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!website_url) {
      void updateAuth({
        website_url: window.location.origin,
      });
    }
  }, [updateAuth, settingsLoaded, website_url]);

  const authProps = useProviderProps({
    auth_providers: database_config?.auth_providers,
    dbs,
    dbsTables,
    connection_id,
  });

  if (!databaseConfigTable || !authColumn) {
    return (
      <InfoRow>
        Could not find global_settings table or authColumn. Make sure you have
        the correct permissions
      </InfoRow>
    );
  }

  if (!database_config) {
    return <Loading />;
  }

  const { auth_providers, auth_created_user_type } = database_config;

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
          value={database_config.auth_providers?.website_url}
          onChange={(website_url: string) => {
            void updateAuth({
              ...auth_providers,
              website_url,
            });
          }}
        />
        <FormField
          label={t.AuthProviderSetup["Default user type"]}
          data-command="AuthProviderSetup.defaultUserType"
          value={auth_created_user_type ?? "default"}
          fullOptions={
            userTypes?.map((ut) => ({
              key: ut.id,
              subLabel: ut.description ?? "",
            })) ?? []
          }
          onChange={(default_user_type: DBSSchema["user_types"]["id"]) => {
            if (default_user_type === "admin") {
              const result = window.confirm(
                t.AuthProviderSetup[
                  "Warning: You are setting the default user type to 'admin'. This means that new users will be granted the highest level of access!"
                ],
              );
              if (!result) return;
            }

            void dbs.database_configs.update(
              {},
              {
                auth_created_user_type: default_user_type,
              },
            );
          }}
          hint={
            t.ServerSettings[
              "The default user type assigned to new users. Defaults to 'default'"
            ]
          }
        />
        {auth_created_user_type === "admin" && (
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
