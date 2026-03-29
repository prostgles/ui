import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import PopupMenu from "@components/PopupMenu";
import { mdiCookie } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client";
import React, { useCallback, useEffect, useMemo } from "react";
import { SmartForm } from "src/dashboard/SmartForm/SmartForm";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { t } from "../../../i18n/i18nUtils";
import { EmailAuthSetup } from "../EmailAuthSetup";
import { OAuthProviderSetup } from "../OAuthProviderSetup";
import { useProviderProps } from "./useProviderProps";

export type AuthProvidersConfig = Extract<
  DBSSchema["database_configs"]["auth_providers"],
  { website_url: string }
>;

export const AuthProviderSetup = ({
  connectionId,
}: {
  connectionId: string;
}) => {
  const { dbs, dbsTables, dbsSql } = usePrglCore();
  const databaseConfigTable = dbsTables.find(
    (t) => t.name === "database_configs",
  );
  const authColumn = databaseConfigTable?.columns.find(
    (c) => c.name === "auth_providers",
  );
  const databaseConfigFilter = useMemo(
    () =>
      ({
        $existsJoined: { connections: { id: connectionId } },
      }) as const,
    [connectionId],
  );
  const { data: databaseConfig } =
    dbs.database_configs.useSubscribeOne(databaseConfigFilter);
  const { data: userTypes } = dbs.user_types.useFind();
  const updateAuth = useCallback(
    async (auth: Partial<DBSSchema["database_configs"]["auth_providers"]>) => {
      await dbs.database_configs.update(databaseConfigFilter, {
        auth_providers:
          !auth ? undefined : (
            {
              website_url:
                databaseConfig?.auth_providers?.website_url ??
                window.location.origin,
              ...databaseConfig?.auth_providers,
              ...auth,
            }
          ),
      });
    },
    [dbs.database_configs, databaseConfig, databaseConfigFilter],
  );

  const settingsLoaded = !!databaseConfig;
  const { website_url } = databaseConfig?.auth_providers ?? {};
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!website_url) {
      void updateAuth({
        website_url: window.location.origin,
      });
    }
  }, [updateAuth, settingsLoaded, website_url]);

  const authProps = useProviderProps({
    auth_providers: databaseConfig?.auth_providers,
    dbs,
    dbsTables,
    connectionId,
  });

  if (!databaseConfigTable || !authColumn) {
    return (
      <InfoRow>
        Could not find global_settings table or authColumn. Make sure you have
        the correct permissions
      </InfoRow>
    );
  }

  if (!databaseConfig) {
    return <Loading />;
  }

  const { auth_providers, auth_created_user_type } = databaseConfig;

  return (
    <FlexCol className="AuthProviderSetup f-1">
      <InfoRow className="mx-1" variant="naked" color="info" iconPath="">
        Manage user authentication methods, default user roles, and third-party
        login providers to control access.
      </InfoRow>
      <FlexCol className="p-1 gap-2">
        <FlexRow>
          <FormField
            data-command="AuthProviderSetup.websiteURL"
            label={t.AuthProviderSetup["Website URL"]}
            hint={t.AuthProviderSetup["Used for redirect uri"]}
            value={databaseConfig.auth_providers?.website_url}
            onChange={(website_url: string) => {
              void updateAuth({
                ...auth_providers,
                website_url,
              });
            }}
          />

          <PopupMenu
            button={
              <Btn variant="faded" iconPath={mdiCookie}>
                Cookie options
              </Btn>
            }
            onClickClose={false}
          >
            <SmartForm
              confirmUpdates={true}
              label=""
              tableName="database_configs"
              columns={
                {
                  cookie_options: 1,
                } satisfies Partial<
                  Record<keyof DBSSchema["database_configs"], 1>
                >
              }
              disabledActions={["clone", "delete"]}
              db={dbs}
              sql={dbsSql}
              methods={{}}
              tables={dbsTables}
              rowFilter={[{ fieldName: "id", value: databaseConfig.id }]}
              showJoinedTables={false}
            />
          </PopupMenu>
        </FlexRow>
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
