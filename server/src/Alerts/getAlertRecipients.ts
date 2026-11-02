import type { DBHandlerServer } from "prostgles-server";
import type { TableHandlerForColumns } from "prostgles-types";
import type { DBS } from "..";
import type { AlertRule } from "./AlertTypes";

export const getAlertRecipients = async (
  dbs: DBS,
  dbo: DBHandlerServer,
  userFilter: AlertRule["userFilter"],
  syncUsers: boolean,
) => {
  /* Config projects add user types beyond the state schema's generated enum. */
  const stateUsers = dbs.users as TableHandlerForColumns<{
    id: string;
    username: string;
    type: string;
    status: string;
  }>;
  const users = await stateUsers.find(
    { $and: [{ status: "active" }, userFilter] },
    { select: ["id"], limit: null },
  );
  if (!syncUsers || !users.length) return users;
  const syncedUsers = dbo.users as
    TableHandlerForColumns<{ id: string; status: string }> | undefined;
  if (!syncedUsers) throw new Error('User sync requires a "users" table');
  return syncedUsers.find(
    { id: { $in: users.map(({ id }) => id) }, status: "active" },
    { select: ["id"], limit: null },
  );
};
