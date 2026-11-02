import { USER_TYPES } from "@common/authTypesAndConstants";
import type { DBSSchema } from "@common/publishUtils";
import { defineFunction } from "prostgles-server";
import { sendInviteEmail } from "../authConfig/invites/sendInviteEmail";
import { getUserTypeWithoutSQLFilter } from "../publish/getAllowedConnectionsFilter";
import { defineFunctionGroup } from "./defineFunctionGroup";

export const userInviteFunctions = {
  userInvites: defineFunctionGroup({
    userFilter: {
      type: { $in: [USER_TYPES.ADMIN, USER_TYPES.CONNECTION_ADMIN] },
    },
    functions: {
      inviteUser: defineFunction({
        description:
          "The user inherits the selected type's access. Sending again replaces a pending invitation. Disable the user to revoke it.",
        input: {
          email: "string",
          userType: {
            type: "ValueLookup",
            table: "user_types",
            column: "id",
            title: "User type",
            searchColumns: ["id"],
            filter: { id: { $nin: [USER_TYPES.ADMIN, USER_TYPES.PUBLIC] } },
          },
        },
        unrestrictedDbAccess: true,
        run: async ({ email: inputEmail, userType }, { dbo: dbs, user }) => {
          if (user.passwordless_admin) {
            throw new Error("Set an admin password before inviting users");
          }
          const email = inputEmail.trim().toLowerCase();
          if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Enter a valid email address");
          }
          const allowedType = await dbs.user_types.findOne({
            id: userType as DBSSchema["user_types"]["id"],
            ...(user.type === USER_TYPES.CONNECTION_ADMIN &&
              getUserTypeWithoutSQLFilter([])),
          });
          if (!allowedType) throw new Error("This user type cannot be invited");
          const type = allowedType.id;
          const databaseConfig = await dbs.database_configs.findOne({
            $existsJoined: { connections: { is_state_db: true } },
          });
          return dbs.tx(async (dbsTx) => {
            const existingUser = await dbsTx.users.findOne({
              $or: [
                { $filter: [{ $lower: ["email"] }, "=", email] },
                { $filter: [{ $lower: ["username"] }, "=", email] },
              ],
            });
            if (
              existingUser &&
              (existingUser.registration?.type !== "invite" ||
                existingUser.registration.confirmed_on ||
                existingUser.status !== "pending" ||
                existingUser.type !== type)
            ) {
              throw new Error("An account already exists for this email");
            }
            const invitedUser =
              existingUser ??
              (await dbsTx.users.insert(
                {
                  username: email,
                  email,
                  type,
                  status: "pending",
                  password: "",
                  registration: {
                    type: "invite",
                    invited_by: user.id,
                    date: new Date().toISOString(),
                    confirmed_on: null,
                    code_hash: "",
                    expires: new Date().toISOString(),
                  },
                },
                { returning: "*" },
              ));
            await sendInviteEmail(
              dbsTx,
              invitedUser,
              databaseConfig?.auth_providers ?? null,
            );
            return `Invitation sent to ${email}. They can sign in after confirming their email.`;
          });
        },
      }),
    },
  }),
};
