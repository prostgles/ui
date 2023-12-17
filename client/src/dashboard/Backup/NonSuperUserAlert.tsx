import React, { useEffect, useState } from "react";
import { ExtraProps } from "../../App";
import { InfoRow } from "../../components/InfoRow";

function NonSuperUserAlert({
  dbsMethods,
  connectionId
}: Pick<ExtraProps, "dbsMethods"> & {
  connectionId: string;
}){

  const [isSU, setIsSU] = useState({ loaded: false, isSU: false });
  useEffect(() => {
    (async () => {
      if(dbsMethods?.getIsSuperUser && connectionId){
        const isSU = await dbsMethods.getIsSuperUser(connectionId);
        setIsSU({ loaded: true, isSU });
      }
    })()
  }, [dbsMethods, connectionId])

  if(isSU.loaded && !isSU.isSU){
    return <InfoRow>Using non superuser postgres account. This action might not be fully successful</InfoRow>;
  }
  return null;
}

export default NonSuperUserAlert;