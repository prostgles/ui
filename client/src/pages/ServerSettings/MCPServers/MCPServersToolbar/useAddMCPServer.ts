import { useEffect, useMemo, useState } from "react";
import {
  isObject,
  type DBSSchema,
} from "../../../../../../commonTypes/publishUtils";
import { isEmpty } from "../../../../utils";

type NewMCPServer = Pick<
  DBSSchema["mcp_servers"],
  "name" | "command" | "args" | "env" | "config_schema"
>;

export const useAddMCPServer = (showAddServer: boolean) => {
  const [value, setValue] = useState("");
  /** Reset on close */
  useEffect(() => {
    setValue("");
  }, [showAddServer]);
  const [config, setConfig] = useState<MCPServerConfig>();
  const [mcpServer, setMCPServer] = useState<NewMCPServer>();

  const potentialConfigSchemas = useMemo(
    () => mcpServer && getPotentialConfigSchemas(mcpServer),
    [mcpServer],
  );
  const [configSchemas, setConfigSchemas] =
    useState<typeof potentialConfigSchemas>();

  const configSchema = useMemo(() => {
    if (!configSchemas) return undefined;
    const schema: NewMCPServer["config_schema"] = Object.fromEntries(
      configSchemas
        .filter((s) => s.configurable)
        .map((schema) => {
          if (schema.type === "env") {
            return [
              schema.name,
              {
                type: schema.type,
                title: schema.name,
                description: schema.description,
              } satisfies {
                type: "env";
                title?: string;
                optional?: boolean;
                description?: string;
              },
            ];
          }
          return [
            schema.name,
            {
              type: schema.type,
              title: schema.name,
              description: schema.description,
              index: schema.index,
            } satisfies {
              type: "arg";
              title?: string;
              optional?: boolean;
              description?: string;
              index?: number;
            },
          ];
        }),
    );
    return schema;
  }, [configSchemas]);

  useEffect(() => {
    setConfigSchemas(potentialConfigSchemas);
  }, [potentialConfigSchemas]);

  useEffect(() => {
    if (!config) {
      setMCPServer(undefined);
    } else {
      const [mcpServer, ...otherServers] = Object.entries(
        config.mcpServers,
      ).map(
        ([name, config]) =>
          ({
            name,
            ...config,
            command: config.command as "docker",
            env: config.env ?? null,
            config_schema: null,
          }) satisfies NewMCPServer,
      );
      if (otherServers.length) {
        alert("Only one MCP server can be added at a time");
        return;
      }
      setMCPServer(mcpServer);
    }
  }, [config]);

  useEffect(() => {
    try {
      const parsedConfig = JSON.parse(value);
      if (
        !parsedConfig ||
        !isObject(parsedConfig) ||
        !parsedConfig.mcpServers ||
        isEmpty(parsedConfig.mcpServers)
      ) {
        throw new Error("Invalid config");
      }
      setConfig(parsedConfig as MCPServerConfig);
    } catch (e) {
      setConfig(undefined);
    }
  }, [value]);

  return {
    mcpServer: mcpServer && {
      ...mcpServer,
      config_schema: isEmpty(configSchema) ? null : configSchema,
    },
    configSchemas,
    setConfigSchemas,
    value,
    setValue,
  };
};

type MCPConfig = {
  command: string;
  args: string[] | null;
  env?: Record<string, string> | null;
};

export type MCPServerConfig = {
  mcpServers: Record<string, MCPConfig>;
};

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
const getPotentialConfigSchemas = (config: MCPConfig): ArgDef[] => {
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

// <SmartForm
//   asPopup={true}
//   label="Add MCP Server"
//   db={dbs as DBHandlerClient}
//   methods={dbsMethods}
//   onClose={() => setShowAddServer(false)}
//   columnFilter={(c) =>
//     [
//       "name",
//       "info",
//       "config_schema",
//       "command",
//       "env",
//       "args",
//     ].includes(c.name)
//   }
//   tableName="mcp_servers"
//   tables={dbsTables}
//   showJoinedTables={false}
// />
