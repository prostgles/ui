import {
  getJSONBSchemaAsJSONSchema,
  omitKeys,
  type JSONB,
} from "prostgles-types";

export type CreateContainerParams = JSONB.GetSchemaType<
  typeof createContainerSchema
>;

const filesSchema = {
  description: "Files to copy into the container. Must include a Dockerfile",
  arrayOfType: {
    name: { type: "string", description: "File name. E.g.: 'index.ts' " },
    content: {
      type: "string",
      description:
        "File content. E.g.: 'import type { JSONB } from \"prostgles-types\";' ",
    },
  },
} as const satisfies JSONB.JSONBSchema;

const meta = {
  description: "Used internally by prostgles",
  type: {
    userId: "string",
    chatId: "number",
  },
} as const satisfies JSONB.JSONBSchema;

export const createContainerSchema = {
  description: "Create a new Docker sandbox container",
  type: {
    files: filesSchema,
    timeout: {
      type: "number",
      optional: true,
      description:
        "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ",
      // default: 30000,
    },
    networkMode: {
      enum: ["none", "bridge", "host"],
      description: "Network mode for the container. Defaults to 'none'",
      // default: "none",
      optional: true,
    },
    environment: {
      description: "Environment variables to set in the container",
      record: { values: "string", partial: true },
      optional: true,
    },
    memory: {
      type: "string",
      description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m",
      optional: true,
      // default: "512m",
    },
    cpus: {
      type: "string",
      description: "CPU limit (e.g., '0.5', '1'). Defaults to 1",
      optional: true,
      // default: "1",
    },
    meta,
  },
} as const satisfies JSONB.JSONBSchema;

const createContainerJSONSchema = omitKeys(
  getJSONBSchemaAsJSONSchema("", "", createContainerSchema),
  ["$id", "$schema"],
);
export { createContainerJSONSchema };
