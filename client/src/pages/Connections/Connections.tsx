import { mdiPlus } from "@mdi/js";
import React from "react";
import { ROUTES } from "@common/utils";
import type { PrglState } from "../../App";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import { t } from "../../i18n/i18nUtils";
import { Connection } from "./Connection";
import { ConnectionsOptions } from "./ConnectionsOptions";
import { CreateConnection } from "./CreateConnection/CreateConnection";
import { useConnections } from "./useConnections";
import { useConnectionServersList } from "./useConnectionServersList";

export const Connections = (props: PrglState) => {
  const { user, dbs, dbsMethods } = props;
  const state = useConnections(props);
  const { connections, isAdmin, showDbNames } = state;
  const { serverUserGroupings } = useConnectionServersList(state);
  if (!user || !connections || !serverUserGroupings) return <Loading />;

  const {
    createConnection,
    getSampleSchemas,
    runConnectionQuery,
    validateConnection,
  } = dbsMethods;

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
        {serverUserGroupings.map(({ name, conns }, i) => {
          const firstConn = conns[0];
          return (
            <div key={i} className=" max-w-800 w-full">
              <FlexRow
                className="gap-p25 jc-end p-p5"
                style={{ fontWeight: 400 }}
              >
                <h4
                  title={t.ConnectionServer["Server info"]}
                  className="m-0 flex-row gap-p5 p-p5 ai-center text-1p5 jc-end text-ellipsis"
                >
                  <div className="text-ellipsis">{name}</div>
                </h4>
                {firstConn &&
                  createConnection &&
                  getSampleSchemas &&
                  runConnectionQuery &&
                  validateConnection && (
                    <CreateConnection
                      connId={firstConn.id}
                      createConnection={createConnection}
                      getSampleSchemas={getSampleSchemas}
                      runConnectionQuery={runConnectionQuery}
                      validateConnection={validateConnection}
                      connections={conns}
                      connectionGroupKey={name}
                      dbs={dbs}
                      showCreateText={Boolean(
                        isAdmin &&
                          serverUserGroupings.length <= 1 &&
                          !conns.filter((c) => !c.is_state_db).length,
                      )}
                    />
                  )}
              </FlexRow>
              <div className="flex-col gap-p5 ">
                {conns.map((c) => (
                  //@ts-ignore
                  <Connection
                    key={c.id}
                    {...props}
                    connection={c}
                    showDbName={showDbNames}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </FlexCol>
  );
};
