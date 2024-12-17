import React, { useState } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import { EmailAuthSetup } from "./EmailAuthSetup";
import { OAuthProviderSetup } from "./OAuthProviderSetup";
import { useAsyncEffectQueue } from "prostgles-client/dist/prostgles";
import Select from "../../components/Select/Select";

export type AuthProvidersConfig = Extract<
  DBSSchema["global_settings"]["auth_providers"],
  { website_url: string }
>;
export type AuthProviderProps = {
  dbs: Prgl["dbs"];
  dbsTables: Prgl["dbsTables"];
  authProviders: AuthProvidersConfig;
  contentClassName: string;
  disabledInfo: string | undefined;
};

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
  const updateAuth = async (
    auth: Partial<DBSSchema["global_settings"]["auth_providers"]>,
  ) => {
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
  };
  useAsyncEffectQueue(async () => {
    if (!global_settings) return;
    if (!global_settings.auth_providers?.website_url) {
      updateAuth({
        website_url: window.location.origin,
      });
    }
  }, [global_settings]);

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
  const authProps = {
    dbs,
    authProviders: auth_providers ?? { website_url: "" },
    dbsTables,
    disabledInfo:
      !auth_providers?.website_url ? "Must setup website URL first" : undefined,
    contentClassName: "flex-col gap-2 p-2",
  };

  return (
    <FlexCol className="p-1 f-1">
      <FlexCol className="p-1 gap-2">
        <FormField
          label={"Website URL"}
          hint="Used for redirect uri"
          value={global_settings.auth_providers?.website_url}
          onChange={async (website_url) => {
            updateAuth({
              ...auth_providers,
              website_url,
            });
          }}
        />
        <Select
          label="Default user type"
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
                "Warning: You are setting the default user type to 'admin'. This means that new users will be granted the highest level of access!",
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
          The default user type assigned to new users. Defaults to 'default'
        </InfoRow>
        {auth_providers?.created_user_type === "admin" && (
          <InfoRow variant="filled" color="danger">
            Warning: The default user type is set to 'admin'. This will allow
            new users to access all resources.
          </InfoRow>
        )}
      </FlexCol>
      {/* <EmailAuthSetup {...authProps} /> */}
      <OAuthProviderSetup provider="google" {...authProps} />
      <OAuthProviderSetup provider="github" {...authProps} />
      <OAuthProviderSetup provider="microsoft" {...authProps} />
      <OAuthProviderSetup provider="facebook" {...authProps} />
    </FlexCol>
  );
};
