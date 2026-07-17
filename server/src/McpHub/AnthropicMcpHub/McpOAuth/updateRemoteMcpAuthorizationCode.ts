import type { DBS } from "@src/index";
import { getJSONBObjectSchemaValidationError } from "prostgles-types";

export const updateRemoteMcpAuthorizationCode = async (
  dbs: DBS,
  data: unknown,
) => {
  const validation = getJSONBObjectSchemaValidationError(
    {
      server_name: "string",
      scopes: "string",
      code: "string",
    },
    data,
  );

  if (validation.error !== undefined) {
    return { success: false, message: validation.error } as const;
  }
  const { scopes: scopesStr, code, server_name } = validation.data;

  return await dbs
    .tx(async (t) => {
      const scopes = (JSON.parse(scopesStr) as string[]).sort();
      const existingConfig = await t.mcp_server_configs.findOne({
        server_name,
        config: { scopes },
      });
      if (!existingConfig) {
        throw new Error(
          `MCP server config with scope "${scopesStr}" not found.`,
        );
      }
      const { oauth } = existingConfig;
      if (!oauth) {
        throw new Error(
          `MCP server config with scope "${scopesStr}" has no OAuth config.`,
        );
      }
      if (oauth.phase !== "waiting-for-auth") {
        throw new Error(
          `MCP server config with scope "${scopesStr}" is not in the correct phase for updating the authorization code. Current phase: ${oauth.phase}`,
        );
      }
      await t.mcp_server_configs.update(
        { id: existingConfig.id },
        {
          oauth: {
            phase: "code-provided",
            redirectUri: oauth.redirectUri,
            state: oauth.state,
            scopes: oauth.scopes,
            pendingAuthorizationCode: code,
          },
        },
      );
      await t.mcp_servers.update(
        {
          name: existingConfig.server_name,
        },
        {
          enabled: true,
        },
      );
      return existingConfig;
    })
    .then(async (data) => {
      const { id: mcp_server_config_id, server_name } = await data;
      return {
        success: true,
        server_name,
        mcp_server_config_id,
        code,
        // state,
      } as const;
    })
    .catch((err) => {
      console.error("Error updating remote MCP authorization code:", err);
      return {
        success: false,
        message: "Error updating remote MCP authorization code",
      } as const;
    });
};
