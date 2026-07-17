export const getMcpOAuthMetadata = async (remoteMcpUrl: string) => {
  const getOAuthMetadataUrl = (route: keyof OAuthRouteDataMap, url: string) => {
    const { origin, pathname } = new URL(url);

    return origin + ["/.well-known", route, pathname.slice(1)].join("/");
  };

  const metadata = await fetchJson<{
    resource: string;
    authorization_servers: string[];
    scopes_supported: string[];
  }>(getOAuthMetadataUrl("oauth-protected-resource", remoteMcpUrl));

  const [firstServerUrl] = metadata.authorization_servers;

  if (!firstServerUrl) {
    throw new Error(
      `MCP server "${remoteMcpUrl}" has no authorization endpoint`,
    );
  }

  const serverInfo = await fetchJson<{
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    response_types_supported: string[];
    grant_types_supported: string[];
    service_documentation?: string;
    scopes_supported: string[];
  }>(
    getOAuthMetadataUrl(
      "oauth-authorization-server",
      firstServerUrl,
    ).toString(),
  );

  return { metadata, serverInfo };
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const data = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Prostgles-MCP-Client/1.0",
    },
  });
  if (!data.ok) {
    throw new Error(
      `Failed to fetch MCP OAuth metadata from "${url}": ${data.status} ${data.statusText}`,
    );
  }
  return (await data.json()) as T;
};

type OAuthRouteDataMap = {
  "oauth-protected-resource": {
    resource: string;
    authorization_servers: string[];
    scopes_supported: string[];
    resource_name?: string;
    bearer_methods_supported?: string[];
  };
  "oauth-authorization-server": {
    authorization_endpoint: string;
    token_endpoint: string;
    scopes_supported: string[];
    resource_name?: string;
  };
};
