import { columnDisplayFormatSchema } from "../columnDisplayFormat.schema";

export const tableOptionsJsonbSchema = {
  record: {
    partial: true,
    values: {
      type: {
        icon: { type: "string", optional: true },
        label: { type: "string", optional: true },
        rowIconColumn: { type: "string", optional: true },
        columns: {
          optional: true,
          record: {
            partial: true,
            values: {
              type: {
                icon: { type: "string", optional: true },
                renderAs: {
                  ...columnDisplayFormatSchema,
                  optional: true,
                },
                style: {
                  type: "any",
                  optional: true,
                },
              },
            },
          },
        },
        card: {
          optional: true,
          type: {
            headerColumn: { type: "string", optional: true },
          },
        },
      },
    },
  },
} as const;
