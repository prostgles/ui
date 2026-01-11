import type { DBSSchema } from "@common/publishUtils";
import type { Prgl } from "../../../App";

type UseProviderPropsArgs = {
  dbs: Prgl["dbs"];
  dbsTables: Prgl["dbsTables"];
  auth_providers: DBSSchema["database_configs"]["auth_providers"] | undefined;
  connection_id: string;
};
export const useProviderProps = ({
  dbs,
  dbsTables,
  auth_providers,
  connection_id,
}: UseProviderPropsArgs) => {
  const doUpdate = async (newValue: typeof auth_providers) => {
    await dbs.database_configs.update(
      {
        $existsJoined: { connections: { id: connection_id } },
      },
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
