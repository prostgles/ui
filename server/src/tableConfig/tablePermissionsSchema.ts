import {
  fieldFilterSchema,
  forcedFilterSchema,
} from "@common/tablePermissionsSchema";
import type { JSONB } from "prostgles-types";

forcedFilterSchema satisfies JSONB.FieldType;
fieldFilterSchema satisfies JSONB.FieldType;

export const tablePermissionsSchema = {
  title: "Tables",
  description: "Tables the assistant can access",
  record: {
    values: {
      type: {
        /** TODO: this must re-use access control data and UI */
        select: {
          oneOf: [
            { enum: [true] },
            {
              type: {
                forcedFilter: forcedFilterSchema,
                fields: fieldFilterSchema,
              },
            },
          ],
          optional: true,
        },
        update: {
          oneOf: [
            { enum: [true] },
            {
              type: {
                forcedFilter: forcedFilterSchema,
                fields: fieldFilterSchema,
              },
            },
          ],
          optional: true,
        },
        insert: {
          oneOf: [
            { enum: [true] },
            {
              type: {
                fields: fieldFilterSchema,
              },
            },
          ],
          optional: true,
        },
        delete: {
          oneOf: [
            { enum: [true] },
            {
              type: {
                forcedFilter: forcedFilterSchema,
              },
            },
          ],
          optional: true,
        },
      },
    },
  },
} as const satisfies JSONB.FieldType;
