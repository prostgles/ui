import { type DBSSchema } from "@common/publishUtils";
import { fromEntries } from "@common/utils";
import {
  getJSONBSchemaAsJSONSchema,
  getJSONBSchemaValidationError,
  type JSONB,
} from "prostgles-types";
import { useCallback, useEffect, useMemo, useState } from "react";

type MCPServerData = Pick<
  DBSSchema["mcp_servers"],
  "name" | "command" | "args" | "env" | "config_schema" | "url"
>;

type ConfigSchema = NonNullable<MCPServerData["config_schema"]>;
type ConfigSchemaItem = ConfigSchema[string];

export const useAddMCPServer = (showAddServer: boolean) => {
  const [value, setValue] = useState("");
  /** Reset on close */
  useEffect(() => {
    setValue("");
  }, [showAddServer]);
  const [config, setConfig] = useState<NewMcpServersJsonConfig>();
  const [mcpServersWithoutSchema, setMCPServers] = useState<
    {
      serverData: MCPServerData;
      potentialConfigSchemas: ReturnType<typeof getPotentialConfigSchemas>;
    }[]
  >();
  const mcpServers = useMemo(() => {
    if (!mcpServersWithoutSchema) return undefined;
    return mcpServersWithoutSchema.map((s) => {
      const configSchema: ConfigSchema | undefined =
        !s.potentialConfigSchemas.length ?
          undefined
        : fromEntries(
            s.potentialConfigSchemas
              .filter((s) => s.configurable)
              .map((schema) => {
                if (schema.type === "env") {
                  return [
                    schema.name,
                    {
                      type: schema.type,
                      title: schema.name,
                      description: schema.description,
                    },
                  ] as [string, ConfigSchemaItem];
                }
                return [
                  schema.name,
                  {
                    type: schema.type,
                    title: schema.name,
                    description: schema.description,
                    index: schema.index,
                  },
                ] as [string, ConfigSchemaItem];
              }),
          );
      return {
        ...s,
        serverData: {
          ...s.serverData,
          config_schema: configSchema ?? null,
        },
      };
    });
  }, [mcpServersWithoutSchema]);
  const [activeMCPServerIndex, setActiveMCPServerIndex] = useState(0);
  const mcpServer = useMemo(() => {
    if (!mcpServers || !mcpServers.length) return undefined;
    return mcpServers[activeMCPServerIndex];
  }, [mcpServers, activeMCPServerIndex]);

  const configSchemas =
    mcpServers?.[activeMCPServerIndex]?.potentialConfigSchemas;

  useEffect(() => {
    if (!config) {
      setMCPServers(undefined);
    } else {
      const mcpServers = Object.entries(config.mcpServers).map(
        ([name, config]) => {
          if ("url" in config) {
            return {
              name,
              ...config,
              command: "streamable-http",
              url: config.url,
              args: null,
              env: null,
              config_schema: null,
            } satisfies MCPServerData;
          }
          return {
            name,
            ...config,
            env: config.env || null,
            args: config.args || null,
            url: null,
            command: config.command,
            config_schema: null,
          } satisfies MCPServerData;
        },
      );

      setMCPServers(
        mcpServers.map((serverData) => {
          const potentialConfigSchemas = getPotentialConfigSchemas(serverData);

          return {
            serverData,
            potentialConfigSchemas,
          };
        }),
      );
    }
  }, [config]);

  const [error, setError] = useState<string>();
  useEffect(() => {
    try {
      const parsedConfig = JSON.parse(value);
      const validation = getJSONBSchemaValidationError(
        newMcpServersJsonbSchema,
        parsedConfig,
      );
      setError(validation.error);
      if (validation.data) {
        setConfig(parsedConfig as NewMcpServersJsonConfig);
      } else {
        setConfig(undefined);
      }
    } catch (e) {
      setConfig(undefined);
    }
  }, [value]);

  const setActiveMCPServer = useCallback(
    (newData: Partial<NonNullable<typeof mcpServers>[number]>) => {
      if (!mcpServers) return;
      const newMcpServers = [...mcpServers].map((s, i) => ({
        ...s,
        ...(activeMCPServerIndex === i && newData),
      }));
      setMCPServers(newMcpServers);
    },
    [activeMCPServerIndex, mcpServers],
  );

  return {
    mcpServers,
    activeMCPServerIndex,
    setActiveMCPServerIndex,
    mcpServer,
    configSchemas,
    setActiveMCPServer,
    value,
    setValue,
    error,
  };
};

const newMcpServerJsonbSchema = {
  oneOfType: [
    {
      command: { enum: ["npx", "npm", "uvx", "uv", "docker"] },
      args: { type: "string[]", optional: true },
      env: { record: { values: "string" }, optional: true },
    },
    {
      command: { enum: ["streamable-http"], optional: true },
      url: "string",
      headers: { record: { values: "string" }, optional: true },
    },
  ],
} as const satisfies JSONB.JSONBSchema;

const newMcpServersJsonbSchema = {
  record: {
    keysEnum: ["mcpServers"],
    values: {
      record: {
        values: newMcpServerJsonbSchema,
      },
    },
  },
} as const satisfies JSONB.FieldType;

export const newMcpServersJsonSchema = getJSONBSchemaAsJSONSchema(
  "",
  "",
  newMcpServersJsonbSchema,
);

export type NewMcpServersJsonConfig = JSONB.GetType<
  typeof newMcpServersJsonbSchema
>;

type ArgDef =
  | {
      type: "env";
      name: string;
      description?: string;
      configurable?: boolean;
    }
  | {
      type: "arg";
      name: string;
      description?: string;
      index: number;
      configurable?: boolean;
    };
const getPotentialConfigSchemas = (
  config: Pick<MCPServerData, "env" | "args">,
): ArgDef[] => {
  const envs: ArgDef[] = [];
  const args: ArgDef[] = [];
  config.args?.forEach((arg, argIndex) => {
    /** Ignore first argument because it should just be the tool package name */
    if (!argIndex) return;
    args.push({
      type: "arg",
      name: arg,
      index: argIndex,
    });
  });

  Object.entries(config.env ?? {}).forEach(([key, value]) => {
    envs.push({
      type: "env",
      name: key,
      description: value,
    });
  });

  const result = [
    ...envs,
    /** Exclude cases where an environment variable is used in the arguments. Keep only the env argument */
    ...args.filter((a) => !envs.some((e) => e.name === a.name)),
  ];

  return result.sort((a, b) => {
    return (
      /** Env vars first */
      b.type.localeCompare(a.type) ||
      b.name.length - a.name.length ||
      a.name.localeCompare(b.name)
    );
  });
};
