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

          const registrationType =
            (
              data.registration &&
              "type" in data.registration &&
              typeof data.registration.type === "string"
            ) ?
              data.registration.type
            : undefined;

          const nonPasswordAccount =
            data.passwordless_admin ||
            registrationType === "OAuth" ||
            registrationType === "magic-link" ||
            data.type === "public";

          if (nonPasswordAccount && !data.password) return;

          if ("password" in data) {
            if (typeof data.password !== "string") {
              throw "Password must be a string";
            }
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
                ...data,
                id,
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
