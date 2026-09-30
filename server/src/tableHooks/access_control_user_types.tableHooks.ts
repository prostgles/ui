import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { TableHooks } from "prostgles-server";

export const accessControlUserTypesTableHooks = {
  access_control_user_types: {
    afterEach: [
      {
        commands: { insert: 1, update: 1 },
        validate: async ({ row, dbx }) => {
          const conflictingType = await dbx.access_control_user_types.findOne({
            access_control_id: row.access_control_id,
            user_type: row.user_type === "public" ? { $ne: "public" } : "public",
          });
          if (conflictingType) {
            throw new Error("Cannot mix 'public' and non-public user types");
          }
        },
      },
    ],
  },
} as const satisfies TableHooks<DBGeneratedSchema>;
