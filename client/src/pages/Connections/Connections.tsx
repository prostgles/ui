import { mdiPlus } from "@mdi/js";
import React from "react";
import { ROUTES } from "../../../../commonTypes/utils";
import type { PrglState } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import { t } from "../../i18n/i18nUtils";
import { Connection } from "./Connection";
import { ConnectionServer } from "./ConnectionServer";
import { ConnectionsOptions } from "./ConnectionsOptions";
import { useConnections } from "./useConnections";
import { useConnectionServersList } from "./useConnectionServersList";

export const Connections = (props: PrglState) => {
  const { user, dbs, dbsMethods } = props;
  const state = useConnections(props);
  const { connections, isAdmin, showDbNames } = state;
  const { serverUserGroupings } = useConnectionServersList(state);
  if (!user || !connections || !serverUserGroupings) return <Loading />;

  return (
    <FlexCol
      data-command="Connections"
      className="Connections gap-0 f-1 w-full min-h-0"
    >
      <div className="flex-row as-center w-full gap-p5 mt-1 p-p5  max-w-800">
        {!connections.length && (
          <InfoRow color="info" className=" f-1 w-full">
            {t.Connections["No connections available/permitted"]}
          </InfoRow>
        )}
        {isAdmin && (
          <Btn
            href={ROUTES.NEW_CONNECTION}
            asNavLink={true}
            title={t.Connections["Create new connection"]}
            iconPath={mdiPlus}
            variant="filled"
            color="action"
            data-command="Connections.new"
          >
            {t.Connections["New connection"]}
          </Btn>
        )}

        <ConnectionsOptions {...props} {...state} />
      </div>
      <div className="Connections_list flex-col o-auto min-h-0 p-p5 pb-1 mt-1 gap-2 ai-center">
        {serverUserGroupings.map(({ name, conns }, i) => (
          <div key={i} className=" max-w-800 w-full">
            <ConnectionServer
              name={name}
              dbsMethods={dbsMethods}
              connections={conns}
              dbs={dbs}
              showCreateText={Boolean(
                isAdmin &&
                  serverUserGroupings.length <= 1 &&
                  !conns.filter((c) => !c.is_state_db).length,
              )}
            />
            <div className="flex-col gap-p5 ">
              {conns.map((c) => (
                <Connection
                  key={c.id}
                  {...props}
                  c={c}
                  showDbName={showDbNames}
                  isAdmin={isAdmin as any}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </FlexCol>
  );
};
