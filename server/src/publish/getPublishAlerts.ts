import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { USER_TYPES } from "@common/authTypesAndConstants";
import type { PublishFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { FullFilter } from "prostgles-types";
import { getAllowedConnectionsFilter } from "./getAllowedConnectionsFilter";

export const getPublishAlerts = (
  userId: string,
  userType: string,
): Pick<PublishFullyTyped<DBGeneratedSchema>, "alerts" | "alert_viewed_by"> => {
  const isAdmin = userType === USER_TYPES.ADMIN;
  const notificationFilter: FullFilter<
    DBGeneratedSchema["alerts"]["columns"],
    DBGeneratedSchema
  > =
    isAdmin ?
      {}
    : {
        $and: [
          { user_id: userId },
          getAllowedConnectionsFilter(userType, ["connections"]),
        ],
      };
  return {
    alerts:
      isAdmin ? "*" : (
        {
          select: { fields: "*", forcedFilter: notificationFilter },
        }
      ),
    alert_viewed_by: {
      select: { fields: "*", forcedFilter: { user_id: userId } },
      insert: {
        fields: ["alert_id"],
        forcedData: { user_id: userId },
        checkFilter: { $existsJoined: { alerts: notificationFilter } },
      },
      delete: { filterFields: "*", forcedFilter: { user_id: userId } },
    },
  };
};
