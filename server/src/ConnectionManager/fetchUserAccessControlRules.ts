import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import type { DBHandlerServer } from "prostgles-server";
import type { User } from "./ConnectionManager";
import { nonStateDbAccessRuleFilter } from "../publish/getAllowedConnectionsFilter";

export const fetchUserAccessControlRules = async (
  dbs: DBHandlerServer<DBGeneratedSchema>,
  user: Pick<User, "id" | "type">,
): Promise<DBSSchema["access_control"][]> =>
  dbs.access_control.find({
    $and: [
      nonStateDbAccessRuleFilter,
      {
        $existsJoined: { access_control_user_types: { user_type: user.type } },
      },
    ],
  });
