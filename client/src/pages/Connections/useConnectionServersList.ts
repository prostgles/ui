import { pickKeys, type AnyObject } from "prostgles-types";
import type { DBSSchema } from "../../../../common/publishUtils";
import type { AdminConnectionModel, useConnections } from "./useConnections";

type ServerUser = Pick<
  DBSSchema["connections"],
  "db_host" | "db_port" | "db_user"
>;

type P = Pick<
  ReturnType<typeof useConnections>,
  "connections" | "isAdmin" | "showStateConn"
>;

export const useConnectionServersList = ({
  connections,
  isAdmin,
  showStateConn,
}: P) => {
  if (!connections) return { serverUserGroupings: undefined };
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

  return { serverUserGroupings };
};

export const getServerCoreInfoStr = <
  H extends Pick<DBSSchema["connections"], "db_host" | "db_port" | "db_user">,
>(
  h: H,
) => `${h.db_user}@${h.db_host || "localhost"}:${h.db_port}`;
