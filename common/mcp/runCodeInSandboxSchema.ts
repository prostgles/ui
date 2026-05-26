import { userInputSchema } from "./userInputSchema";
import { fixIndent } from "../utils";

export const USER_INPUT_VALUE_ENV_VARIABLE_NAME = "USER_INPUT_VALUE" as const;
const filesSchema = {
  description: fixIndent(`
    Files to copy into the container. 
    Must include a Dockerfile.
    Example { "index.ts": "import type { JSONB } from \"prostgles-types\"; ..." }`),
  record: {
    partial: true,
    values: {
      type: "string",
      description:
        "File content. E.g.: 'import type { JSONB } from \"prostgles-types\";' ",
    },
  },
} as const;

export const runCodeInSandboxSchema = {
  type: {
    reason: {
      type: "string",
      optional: true,
      description:
        "Reason for executing the code to provide context to the user. One short sentence is enough. ",
    },
    files: filesSchema,
    userInputValue: {
      optional: true,
      description:
        "User populated values for the userInput keys. It will override the default values in userInput if provided. ",
      record: {
        values: "unknown",
      },
    },
    timeout: {
      optional: true,
      type: "integer",
      description:
        "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ",
      // default: 30000,
    },
    networkMode: {
      optional: true,
      enum: ["none", "bridge", "bridge-internal", "host"],
      description:
        "Network mode for the container. Defaults to 'bridge-internal'. Use 'bridge' mode to be able to access the database. Use 'bridge-internal' to access the database but not the internet.",
      // default: "none",
    },
    environment: {
      optional: true,
      description: "Environment variables to set in the container",
      record: { values: "string", partial: true },
    },
    memory: {
      optional: true,
      type: "string",
      description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m",
      // default: "512m",
    },
    cpus: {
      optional: true,
      type: "string",
      description: "CPU limit (e.g., '0.5', '1'). Defaults to 1",
      // default: "1",
    },
    readOnly: {
      optional: true,
      type: "boolean",
      description:
        "Whether to mount the filesystem as read-only. Defaults to true",
      // default: true,
    },
    userInput: {
      ...userInputSchema,
      description:
        fixIndent(`
                Custom controls/user input to provide to the container. 
                Use this to allow the user to re-run the container with custom configuration/input. 
                Will be available in the container through the ${USER_INPUT_VALUE_ENV_VARIABLE_NAME} environment variable as stringified JSON.\n`) +
        userInputSchema.description,
    },
  },
} as const;
