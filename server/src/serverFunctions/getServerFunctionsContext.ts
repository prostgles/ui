import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { SUser } from "@src/authConfig/sessionUtils";
import { initBackupManager } from "@src/init/prostglesOnReady";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import type { PublishParams } from "prostgles-server";

export const getServerFunctionsContext = async (
  params: PublishParams<DBGeneratedSchema, SUser> | undefined,
) => {
  if (!params?.user) return;
  const { dbo: dbs, db: _dbs, user, sql } = params;
  const backupManager = await initBackupManager(_dbs, dbs, sql);
  const servicesManager = getServiceManager(dbs);
  if (user.type === "admin") {
    return {
      ...params,
      backupManager,
      servicesManager,
      dbs,
      user,
      type: "admin" as const,
    };
  }
  return {
    ...params,
    dbs,
    type: "user" as const,
  };
};
