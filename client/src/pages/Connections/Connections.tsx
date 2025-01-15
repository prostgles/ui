import { mdiAlert, mdiCogOutline, mdiPlus } from "@mdi/js";
import type { AnyObject, SubscriptionHandler } from "prostgles-types";
import React from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { PrglState } from "../../App";
import Btn from "../../components/Btn";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import PopupMenu from "../../components/PopupMenu";
import { SwitchToggle } from "../../components/SwitchToggle";
import type {
  UserData,
  Workspace,
} from "../../dashboard/Dashboard/dashboardUtils";
import RTComp from "../../dashboard/RTComp";
import { pickKeys } from "prostgles-types";
import { Connection } from "./Connection";
import { ConnectionServer } from "./ConnectionServer";
import { t } from "../../i18n/i18nUtils";

type CommonConnectionInfo = Pick<DBSSchema["connections"], "created"> & {
  access_control: { count: number }[];
  isConnected?: boolean;
  allowedUsers: number;
  workspaces: Workspace[];
};
type ServerUser = Pick<
  DBSSchema["connections"],
  "db_host" | "db_port" | "db_user"
>;

export type BasicConnectionModel = Pick<
  Required<DBSSchema["connections"]>,
  "id" | "name" | "is_state_db"
> &
  CommonConnectionInfo;

export type AdminConnectionModel = Required<DBSSchema["connections"]> &
  CommonConnectionInfo;

type IConnection = BasicConnectionModel | AdminConnectionModel;

type S = {
  connections?: IConnection[];
  showStateConfirm?: HTMLInputElement;
  user?: UserData;
  showDbNames: boolean;
};

export class Connections extends RTComp<PrglState, S> {
  state: S = {
    showDbNames: false,
  };

  loaded = false;
  userSub?: SubscriptionHandler;
  onDelta = async () => {
    const { dbs, user, dbsMethods } = this.props;
    if (user && !this.loaded) {
      this.loaded = true;
      dbs.connections
        .find(
          {},
          {
            orderBy: [{ created: -1 }, { db_conn: 1 }],
            select: {
              "*": 1,
              ...(user.type === "admin" ?
                {
                  access_control: {
                    /** Only include enabled access rules */
                    $leftJoin: ["access_control_connections", "access_control"],
                    select: {
                      count: {
                        $countAll: [],
                      },
                    },
                  },
                }
              : {}),
              workspaces: "*",
            },
          },
        )
        .then(async (_connections) => {
          const cons = await dbsMethods.getConnectedIds?.();

          const connections = await Promise.all(
            (_connections as IConnection[]).map(async (c) => {
              c.allowedUsers = 0;
              if (
                (c.access_control as any)?.[0]?.count &&
                (dbs.users as any).count
              ) {
                c.allowedUsers = await dbs.users.count({
                  $existsJoined: {
                    "user_types.access_control_user_types.access_control.database_configs.connections":
                      { id: c.id },
                  },
                } as any);
              }

              return c;
            }),
          );

          if (this.mounted) {
            this.setState({
              connections: connections.map((c) => ({
                ...c,
                isConnected: !cons || cons.includes(c.id),
              })) as any,
            });
          }
        });
      this.userSub ??= await dbs.users.subscribeOne(
        { id: user.id },
        {},
        (user) => {
          this.setState({ user });
        },
      );
    }
  };

  onUnmount(): void {
    this.userSub?.unsubscribe();
  }

  render() {
    const { dbs, dbsMethods } = this.props;
    const { connections, showStateConfirm, user, showDbNames } = this.state;
    if (!user || !connections) return null;

    const isAdmin = user.type === "admin";

    const showStateConn = user.options?.showStateDB ?? true;

    const canViewStateDB =
      !!connections.length &&
      connections.some((c) => "is_state_db" in c && c.is_state_db);

    if (!this.loaded) return <Loading />;

    let confirmDialog: React.ReactNode;
    if (showStateConfirm) {
      confirmDialog = (
        <ConfirmationDialog
          positioning={"beneath-center"}
          anchorEl={showStateConfirm}
          iconPath={mdiAlert}
          message={
            t.Connections[
              "Editing state data directly may break functionality. Proceed at your own risk!"
            ]
          }
          onClose={() => {
            this.setState({ showStateConfirm: undefined });
          }}
          onAccept={async () => {
            await dbs.users.update(
              { id: user.id },
              { options: { $merge: [{ showStateDB: true }] } },
            );
            this.setState({ showStateConfirm: undefined });
          }}
          acceptBtn={{
            color: "action",
            text: "OK",
            dataCommand: "connections.add",
          }}
          asPopup={true}
        />
      );
    }

    const renderedConnections = connections.filter(
      (c) => showStateConn || !c.is_state_db,
    );

    /** Admins will see db_host and db_port. Group by this */
    let serverUserGroupings: {
      name: string;
      conns: typeof connections;
      serverStr: string;
      serverUser: AnyObject;
    }[] = [];
    if (isAdmin) {
      const serverUsers: ServerUser[] = [];
      const parseServer = (s: ServerUser): ServerUser => ({
        db_host: s.db_host || "localhost",
        db_port: s.db_port || 5432,
        db_user: s.db_user,
      });
      const sameServer = (
        _s1: ServerUser,
        _s2: ServerUser,
        sameUser = true,
      ): boolean => {
        const s1 = parseServer(_s1);
        const s2 = parseServer(_s2);
        if (sameUser)
          return (
            [s1.db_host, s1.db_port, s1.db_user].join() ===
            [s2.db_host, s2.db_port, s2.db_user].join()
          );
        return (
          [s1.db_host, s1.db_port].join() === [s2.db_host, s2.db_port].join()
        );
      };

      (renderedConnections as AdminConnectionModel[]).forEach((c) => {
        if (!serverUsers.some((h) => sameServer(h, c))) {
          serverUsers.push(pickKeys(c, ["db_host", "db_port", "db_user"]));
        }
      });
      serverUserGroupings = serverUsers.map((serverUser) => ({
        name: getServerCoreInfoStr(serverUser),
        serverUser,
        serverStr: (serverUser.db_host || "") + (serverUser.db_port || ""),
        conns: renderedConnections.filter((c) =>
          sameServer(c as AdminConnectionModel, serverUser),
        ),
      }));

      serverUserGroupings = serverUserGroupings.sort(
        (a, b) =>
          Math.max(...b.conns.map((c) => +new Date(c.created!))) -
          Math.max(...a.conns.map((c) => +new Date(c.created!))),
      );

      /** Group same servers together */
      const serverStrs = Array.from(
        new Set(serverUserGroupings.map((s) => s.serverStr)),
      );
      serverUserGroupings = serverStrs.flatMap((serverStr) =>
        serverUserGroupings.filter((sg) => sg.serverStr === serverStr),
      );
    } else if (renderedConnections.length) {
      serverUserGroupings.push({
        name: "",
        serverStr: "",
        serverUser: {},
        conns: renderedConnections,
      });
    }

    return (
      <div className="CONNECTIONS flex-col  f-1 w-full min-h-0">
        {confirmDialog}
        <div className="flex-row as-center w-full gap-p5 mt-1 p-p5  max-w-800">
          {!connections.length && (
            <InfoRow color="info" className=" f-1 w-full">
              {t.Connections["No connections available/permitted"]}
            </InfoRow>
          )}
          {isAdmin && (
            <Btn
              href="/new-connection"
              asNavLink={true}
              title={t.Connections["Create new connection"]}
              iconPath={mdiPlus}
              variant="filled"
              color="action"
            >
              {t.Connections["New connection"]}
            </Btn>
          )}

          {isAdmin && (
            <PopupMenu
              className="ml-auto"
              clickCatchStyle={{ opacity: 0 }}
              positioning="beneath-right"
              onClickClose={false}
              contentClassName="p-p5"
              button={<Btn title={t.common.Options} iconPath={mdiCogOutline} />}
            >
              {canViewStateDB && (
                <SwitchToggle
                  label={t.Connections["Show state connection"]}
                  checked={!!showStateConn}
                  onChange={(checked, e) => {
                    if (checked) {
                      this.setState({ showStateConfirm: e.currentTarget });
                    } else {
                      dbs.users.update(
                        { id: user.id },
                        { options: { $merge: [{ showStateDB: false }] } },
                      );
                    }
                  }}
                />
              )}
              <SwitchToggle
                label={t.Connections["Show database names"]}
                checked={showDbNames}
                onChange={(showDbNames) => {
                  this.setState({ showDbNames });
                }}
              />
            </PopupMenu>
          )}
        </div>
        <div className="flex-col o-auto min-h-0 p-p5 pb-1 mt-1 gap-2 ai-center">
          {serverUserGroupings.map(({ name, conns }, i) => (
            <div key={i} className=" max-w-800 w-full">
              <ConnectionServer
                name={name}
                dbsMethods={dbsMethods}
                connections={conns as any}
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
                    {...this.props}
                    c={c}
                    showDbName={showDbNames}
                    isAdmin={isAdmin as any}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export const getServerInfoStr = (
  c: DBSSchema["connections"],
  showuser = false,
) => {
  const userInfo = showuser && c.db_user ? `${c.db_user}@` : "";
  return `${userInfo}${c.db_host || "localhost"}:${c.db_port || "5432"}/${c.db_name}`;
};
export const getServerInfo = (
  c: Pick<DBSSchema["connections"], "db_host" | "db_port" | "db_name">,
) => {
  return (
    <>
      <div className="shrink-label">
        {c.db_host || "localhost"}:{c.db_port || "5432"}/{c.db_name}
      </div>
      {/* <div>User: {c.db_user}</div> */}
    </>
  );
};

export const getServerCoreInfoStr = <
  H extends Pick<DBSSchema["connections"], "db_host" | "db_port" | "db_user">,
>(
  h: H,
) => `${h.db_user}@${h.db_host || "localhost"}:${h.db_port}`;
