import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";

const FieldFilterSchema = {
  oneOf: [
    "string[]",
    { enum: ["*", ""] },
    {
      record: {
        values: { enum: [1, true] },
      },
    },
    {
      record: {
        values: { enum: [0, false] },
      },
    },
  ],
} satisfies JSONB.FieldType;

export const tableConfigAccessControl: TableConfig<{ en: 1 }> = {
  access_control: {
    // dropIfExistsCascade: true,
    columns: {
      id: `SERIAL PRIMARY KEY`,
      name: "TEXT",
      database_id: `INTEGER NOT NULL REFERENCES database_configs(id) ON DELETE CASCADE`,
      llm_daily_limit: {
        sqlDefinition: `INTEGER NOT NULL DEFAULT 0 CHECK(llm_daily_limit >= 0)`,
        info: { hint: "Maximum amount of queires per user/ip per 24hours" },
      },
      dbsPermissions: {
        info: { hint: "Permission types and rules for the state database" },
        nullable: true,
        jsonbSchemaType: {
          createWorkspaces: { type: "boolean", optional: true },
          viewPublishedWorkspaces: {
            optional: true,
            type: {
              workspaceIds: "string[]",
            },
          },
        },
      },
      dbPermissions: {
        info: {
          hint: "Permission types and rules for this (connection_id) database",
        },
        jsonbSchema: {
          oneOfType: [
            {
              type: {
                enum: ["Run SQL"],
                description: "Allows complete access to the database",
              },
              allowSQL: { type: "boolean", optional: true },
            },
            {
              type: {
                enum: ["All views/tables"],
                description: "Custom access (View/Edit/Remove) to all tables",
              },
              allowAllTables: {
                type: "string[]",
                allowedValues: ["select", "insert", "update", "delete"],
              },
            },
            {
              type: {
                enum: ["Custom"],
                description: "Fine grained access to specific tables",
              },
              customTables: {
                arrayOfType: {
                  tableName: "string",
                  select: {
                    optional: true,
                    description: "Allows viewing data",
                    oneOf: [
                      "boolean",
                      {
                        type: {
                          fields: FieldFilterSchema,
                          forcedFilterDetailed: { optional: true, type: "any" },
                          subscribe: {
                            optional: true,
                            type: {
                              throttle: { optional: true, type: "integer" },
                            },
                          },
                          filterFields: {
                            optional: true,
                            ...FieldFilterSchema,
                          },
                          orderByFields: {
                            optional: true,
                            ...FieldFilterSchema,
                          },
                        },
                      },
                    ],
                  },
                  update: {
                    optional: true,
                    oneOf: [
                      "boolean",
                      {
                        type: {
                          fields: FieldFilterSchema,
                          forcedFilterDetailed: { optional: true, type: "any" },
                          checkFilterDetailed: { optional: true, type: "any" },
                          filterFields: {
                            optional: true,
                            ...FieldFilterSchema,
                          },
                          orderByFields: {
                            optional: true,
                            ...FieldFilterSchema,
                          },
                          forcedDataDetail: { optional: true, type: "any[]" },
                          dynamicFields: {
                            optional: true,
                            arrayOfType: {
                              filterDetailed: "any",
                              fields: FieldFilterSchema,
                            },
                          },
                        },
                      },
                    ],
                  },
                  insert: {
                    optional: true,
                    oneOf: [
                      "boolean",
                      {
                        type: {
                          fields: FieldFilterSchema,
                          forcedDataDetail: { optional: true, type: "any[]" },
                          checkFilterDetailed: { optional: true, type: "any" },
                        },
                      },
                    ],
                  },
                  delete: {
                    optional: true,
                    oneOf: [
                      "boolean",
                      {
                        type: {
                          filterFields: FieldFilterSchema,
                          forcedFilterDetailed: { optional: true, type: "any" },
                        },
                      },
                    ],
                  },
                  sync: {
                    optional: true,
                    type: {
                      id_fields: { type: "string[]" },
                      synced_field: { type: "string" },
                      throttle: { optional: true, type: "integer" },
                      allow_delete: { type: "boolean", optional: true },
                    },
                  },
                },
              },
            },
          ],
        },
      },

      created: { sqlDefinition: `TIMESTAMPTZ DEFAULT NOW()` },
    },
  },

  access_control_user_types: {
    columns: {
      access_control_id: `INTEGER NOT NULL REFERENCES access_control(id)  ON DELETE CASCADE`,
      user_type: `TEXT NOT NULL REFERENCES user_types(id)  ON DELETE CASCADE`,
    },
    constraints: {
      NoDupes: "UNIQUE(access_control_id, user_type)",
    },
  },

  access_control_methods: {
    // dropIfExistsCascade: true,
    columns: {
      published_method_id: `INTEGER NOT NULL REFERENCES published_methods  ON DELETE CASCADE`,
      access_control_id: `INTEGER NOT NULL REFERENCES access_control  ON DELETE CASCADE`,
    },
    constraints: {
      pkey: {
        type: "PRIMARY KEY",
        content: "published_method_id, access_control_id",
      },
    },
  },
  access_control_connections: {
    columns: {
      connection_id: `UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE`,
      access_control_id: `INTEGER NOT NULL REFERENCES access_control  ON DELETE CASCADE`,
    },
    indexes: {
      unique_connection_id: {
        unique: true,
        columns: "connection_id, access_control_id",
      },
    },
  },
};
