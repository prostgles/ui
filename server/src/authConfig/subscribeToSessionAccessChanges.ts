import type { DBS } from "..";
import { connectionManager } from "..";
import { statePrgl } from "@src/init/startProstgles";
import { createHash } from "node:crypto";

export const subscribeToSessionAccessChanges = async (dbs: DBS) => {
  let previousSessions = new Map<string, string>();
  return dbs.sessions.subscribe(
    {},
    {
      select: {
        id: 1,
        active: 1,
        expires: 1,
        user_id: 1,
        type: 1,
        // UI preferences already reach clients through their user subscription.
        // 2FA setup secrets do not change access until has_2fa_enabled changes.
        users: { options: 0, last_updated: 0, "2fa": 0 },
      },
      limit: null,
      throttle: 0,
    },
    (sessions) => {
      const currentSessions = new Map(
        sessions.map((session) => [
          session.id,
          createHash("sha256").update(JSON.stringify(session)).digest("hex"),
        ]),
      );
      const changedSessions = [...previousSessions.keys()].filter(
        (sid) => previousSessions.get(sid) !== currentSessions.get(sid),
      );
      previousSessions = currentSessions;
      if (!changedSessions.length) return;
      statePrgl?.invalidateAuth(changedSessions);
      for (const connection of connectionManager.prglConnections.values()) {
        if (connection.state === "started") {
          connection.prgl.invalidateAuth(changedSessions);
        }
      }
    },
  );
};
