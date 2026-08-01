import type { DBS } from "@src/index";
import { getJSONBObjectSchemaValidationError } from "prostgles-types";
import { enqueuedRequestIds } from "./authenticateMcpServer";
import { tout } from "@src/utils/tout";

export const updateRemoteMcpAuthorizationCode = async (
  dbs: DBS,
  data: unknown,
) => {
  const validation = getJSONBObjectSchemaValidationError(
    {
      server_name: "string",
      scopes: "string",
      code: "string",
      request_id: "string",
    },
    data,
    "params for updateRemoteMcpAuthorizationCode",
    undefined,
    { allowExtraProperties: true },
  );

  if (validation.error !== undefined) {
    return { success: false, message: validation.error } as const;
  }
  const { scopes: scopesStr, code, server_name, request_id } = validation.data;

  const matchingRequest = enqueuedRequestIds.has(request_id);
  if (!matchingRequest) {
    return {
      success: false,
      message: `No matching MCP Auth request found for request_id "${request_id}". This may indicate a replay attack or that the request has expired.`,
    } as const;
  }

  return await dbs
    .tx(async (t) => {
      const existingConfig = await t.mcp_server_configs.findOne({
        server_name,
        oauth_request_id: request_id,
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
      if (oauth.phase !== "awaiting_authorization") {
        throw new Error(
          `MCP server config with scope "${scopesStr}" is not in the correct phase for updating the authorization code. Current phase: ${oauth.phase}`,
        );
      }
      await t.mcp_server_configs.update(
        { id: existingConfig.id },
        {
          oauth: {
            phase: "exchanging_code",
            redirectUri: oauth.redirectUri,
            scopes: oauth.scopes,
            clientInformation: oauth.clientInformation,
            discoveryState: oauth.discoveryState,
            pendingAuthorizationCode: code,
            codeVerifier: oauth.codeVerifier,
          },
        },
      );
      enqueuedRequestIds.delete(request_id);
      await tout(1_000);
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
