import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getPasswordHash } from "@src/authConfig/authUtils";
import type { TableHooks } from "prostgles-server";

export const usersTableHooks = {
  users: {
    beforeEach: [
      {
        commands: { insert: 1 },
        changedFields: ["password"],
        validate: (args) => {
          const { data } = args;

          const nonPasswordAccount =
            data.passwordless_admin ||
            data.registration?.type === "OAuth" ||
            data.registration?.type === "magic-link" ||
            data.type === "public";

          if (nonPasswordAccount && !data.password) return;

          if ("password" in data) {
            if (!data.password) {
              throw "Password cannot be empty";
            }
            const id = crypto.randomUUID();

            const hashedPassword = getPasswordHash({ id }, data.password);
            if (!hashedPassword) {
              throw "Password hashing failed";
            }

            return {
              row: {
                id,
                ...data,
                password: hashedPassword,
                last_updated: Date.now().toString(),
              },
            };
          }
        },
      },
    ],
  },
} as const satisfies TableHooks<DBGeneratedSchema>;
