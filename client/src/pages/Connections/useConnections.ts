import { useState } from "react";
import type { PrglState } from "../../App";
import { usePromise } from "prostgles-client/dist/react-hooks";
import type { DBSSchema } from "../../../../common/publishUtils";
import type { Workspace } from "../../dashboard/Dashboard/dashboardUtils";
import type { FilterItem } from "prostgles-types";

type CommonConnectionInfo = Pick<DBSSchema["connections"], "created"> & {
  access_control: { count: number }[];
  isConnected?: boolean;
  allowedUsers: number;
  workspaces: Workspace[];
};

export type BasicConnectionModel = Pick<
  Required<DBSSchema["connections"]>,
  "id" | "name" | "is_state_db"
> &
  CommonConnectionInfo & { db_name?: undefined };

export type AdminConnectionModel = Required<DBSSchema["connections"]> &
  CommonConnectionInfo;

export type IConnection = BasicConnectionModel | AdminConnectionModel;
export const useConnections = (props: PrglState) => {
  const [showStateConfirm, setShowStateConfirm] = useState<HTMLInputElement>();
  const [showDbNames, setShowDbNames] = useState(false);
  const { dbs, user, dbsMethods } = props;
  const isAdmin = user?.type === "admin";

  const showStateConn = user?.options?.showStateDB ?? true;
  const { data: _connections } = dbs.connections.useSubscribe(
    {},
    {
      orderBy: [{ created: -1 }, { db_conn: 1 }],
      select: {
        "*": 1,
        ...(isAdmin ?
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
    { skip: !user },
  );

  const connections = usePromise(async () => {
    if (!_connections) return;

    const connectedConnectionIds = await dbsMethods.getConnectedIds?.();

    const connections = await Promise.all(
      (_connections as IConnection[]).map(async (c) => {
        c.allowedUsers = 0;
        if ((c.access_control as any)?.[0]?.count && (dbs.users as any).count) {
          c.allowedUsers = await dbs.users.count({
            $existsJoined: {
              "user_types.access_control_user_types.access_control.database_configs.connections":
                { id: c.id },
            },
          } as FilterItem);
        }

        return c;
      }),
    );

    return connections.map((c) => ({
      ...c,
      isConnected:
        !connectedConnectionIds || connectedConnectionIds.includes(c.id),
    }));
  }, [_connections, dbs.users, dbsMethods]);

  return {
    connections,
    showStateConfirm,
    setShowStateConfirm,
    showDbNames,
    setShowDbNames,
    isAdmin,
    showStateConn,
  };
};
