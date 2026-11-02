import { USER_TYPES } from "@common/authTypesAndConstants";
import type { DBSSchema } from "@common/publishUtils";
import type { DBS, Users } from "..";
import { getAllowedConnectionsFilter } from "../publish/getAllowedConnectionsFilter";

export const getConnectionUser = async <
  User extends Pick<Users, "id" | "type" | "status">,
>(
  dbs: DBS,
  connection: Pick<DBSSchema["connections"], "id" | "is_state_db">,
  user: User | undefined,
) => {
  if (user?.status !== "active") return undefined;
  if (user.type === USER_TYPES.ADMIN) return user;
  const allowedConnection = await dbs.connections.findOne({
    $and: [{ id: connection.id }, getAllowedConnectionsFilter(user.type, [])],
  });
  return allowedConnection ? user : undefined;
};
