import { USER_SYNC_COLUMNS } from "@common/userSync";
import type { ConnectionManager } from "./ConnectionManager";
import { syncConnectionUsers } from "./syncConnectionUsers";

export function setSyncUserSub(this: ConnectionManager) {
  // Config, access-control and connection startup callbacks can overlap.
  this.userSyncSetup = this.userSyncSetup
    .then(async () => {
      await this.userSub?.unsubscribe();
      const dbs = this.dbs;
      if (!dbs) return;
      this.userSub = await dbs.users.subscribe(
        {},
        { select: [...USER_SYNC_COLUMNS], limit: null, throttle: 1000 },
        () => {
          // Connections can share a database; serialize passes across them too.
          this.userSyncWork = this.userSyncWork.then(async () => {
            for (const connectionId of this.prglConnections.keys()) {
              await this.withActiveConnection(connectionId, (connection) =>
                syncConnectionUsers(dbs, connection),
              ).catch((error: unknown) => {
                console.error(
                  `User sync failed for connection ${connectionId}`,
                  error,
                );
              });
            }
          });
        },
      );
    })
    .catch((error: unknown) => {
      console.error("Could not subscribe to user changes", error);
    });
  return this.userSyncSetup;
}
