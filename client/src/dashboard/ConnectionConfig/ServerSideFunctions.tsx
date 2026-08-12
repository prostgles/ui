import { FlexCol, FlexRow } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { SwitchToggle } from "@components/SwitchToggle";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { PublishedMethods } from "../W_Method/PublishedMethods";

export const ServerSideFunctions = () => {
  const { dbsMethods, dbs, connectionId, dbKey, tables, databaseId } =
    usePrgl();
  const { data: connection } = dbs.connections.useSubscribeOne({
    id: connectionId,
  });
  const { data: dbConfig } = dbs.database_configs.useFindOne(
    {
      id: databaseId,
    },
    { select: { config_sync: 1 } },
  );
  if (!connection) return <Loading />;

  return (
    <FlexCol className="w-full" style={{ gap: "2em" }}>
      <FlexRow>
        <h3>On mount</h3>
        <SwitchToggle
          label={"Enabled"}
          data-command="ServerSideFunctions.onMountEnabled"
          checked={
            !!dbConfig?.config_sync?.toggleableProperties.onMount &&
            !connection.on_mount_ts_disabled
          }
          onChange={async (checked) => {
            await dbsMethods.setOnMount?.({
              connId: connectionId,
              changes: {
                on_mount_ts_disabled: !checked,
              },
            });
          }}
        />
      </FlexRow>
      <PublishedMethods editedRule={undefined} accessRuleId={undefined} />
    </FlexCol>
  );
};
