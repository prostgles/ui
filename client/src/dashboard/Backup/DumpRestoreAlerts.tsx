import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import { InfoRow } from "../../components/InfoRow";
import type { FullExtraProps } from "../../pages/ProjectConnection/ProjectConnection";

export const DumpRestoreAlerts = ({
  dbsMethods,
  connectionId,
  dbProject,
}: Pick<FullExtraProps, "dbsMethods" | "dbProject"> & {
  connectionId: string;
}) => {

  const versionMismatch = usePromise(async () => {
    try {
      const versions = await dbsMethods.getPsqlVersions?.();
      if(!versions){
        return
      }
      const prglVersion = versions.psql.split(")")[1]?.split("(")[0]?.trim();
      if(!prglVersion){
        return
      }
      let serverVersion = await dbProject.sql?.(`show server_version;`, {}, {returnType: "value" }) as string;
      if(!serverVersion) return;
      if(serverVersion.includes("(")){
        serverVersion = serverVersion.split("(")[0]!.trim();
      }
      const serverHasHigherVersion = serverVersion.localeCompare(prglVersion, undefined, { numeric: true, sensitivity: "base" });
      if(serverHasHigherVersion <= 0) return;
      
      const majorVersion = serverVersion.split(".")[0];
      return { 
        prglVersion, 
        serverVersion,
        message: <>
          Server version ({serverVersion}) is higher than the Prostgles UI host version of psql ({prglVersion})
          <br></br>
          {versions.os === "Linux"? 
            <>On linux this command may be used to update Prostgles UI host to the same version: 
            <br></br>
            <strong className="m-1">sudo apt install postgresql-client-{majorVersion}</strong></> : 
            <>This might cause issues.</>
          }
        </>
      }

    } catch {}
  }, [dbsMethods, dbProject]);

  const isSuperUser = usePromise(async () => {
    if(dbsMethods.getIsSuperUser && connectionId){
      return dbsMethods.getIsSuperUser(connectionId);
    }
    return false;
  }, [dbsMethods, connectionId])

  return <>
    {isSuperUser === false && <InfoRow>Using non superuser postgres account. This action might not be fully successful</InfoRow>}
    {versionMismatch && <InfoRow color="danger">{versionMismatch.message}</InfoRow>}
  </> 
}
