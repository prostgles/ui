import { z } from "zod";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth";
import type { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio";
import type {
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth";
import type { ListToolsResult } from "@modelcontextprotocol/sdk/types";
import type { fetchRemoteMcpServerInfo } from "./fetchRemoteMcpServerInfo";

const StdioConfigSchema = z.object({
  transport: z.literal("stdio").optional(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
  disabled: z.boolean().optional(),
});

const OAuthStatePersistFnSchema = z.custom<
  NonNullable<StreamableHTTPOAuthConfig["onPersistState"]>
>((value) => typeof value === "function");

const OAuthRedirectFnSchema = z.custom<
  NonNullable<StreamableHTTPOAuthConfig["onAuthRedirect"]>
>((value) => typeof value === "function");

const OAuthClientProviderSchema = z.custom<OAuthClientProvider>(
  (value) => typeof value === "object" && value !== null,
);

const StreamableHTTPOAuthStateSchema = z.object({
  clientInformation: z.custom<OAuthClientInformationMixed>().optional(),
  tokens: z.custom<OAuthTokens>().optional(),
  codeVerifier: z.string().optional(),
  discoveryState: z.custom<OAuthDiscoveryState>().optional(),
  pendingAuthorizationCode: z.string().optional(),
});

const StreamableHTTPOAuthConfigSchema: z.ZodType<StreamableHTTPOAuthConfig> =
  z.object({
    enabled: z.boolean().optional(),
    redirectUri: z.string().url(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    state: StreamableHTTPOAuthStateSchema.optional(),
    onPersistState: OAuthStatePersistFnSchema.optional(),
    onAuthRedirect: OAuthRedirectFnSchema.optional(),
    authProvider: OAuthClientProviderSchema.optional(),
  });

const StreamableHTTPConfigSchema = z.object({
  transport: z.literal("streamable-http"),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  requestInit: z.unknown().optional(),
  disabled: z.boolean().optional(),
  oauth: StreamableHTTPOAuthConfigSchema.optional(),
});

export const ConfigSchema = z.union([
  StdioConfigSchema,
  StreamableHTTPConfigSchema,
]);

export type StreamableHTTPConfig = z.infer<typeof StreamableHTTPConfigSchema>;

export type McpMode = "full" | "server-use-only" | "off";

export type StreamableHTTPOAuthState = z.infer<
  typeof StreamableHTTPOAuthStateSchema
>;

export type StreamableHTTPOAuthConfig = {
  enabled?: boolean;
  redirectUri: string;
  clientSecret?: string;
  scopes?: string[];
  state?: StreamableHTTPOAuthState;
  onPersistState?: (state: StreamableHTTPOAuthState) => void | Promise<void>;
  onAuthRedirect?: (authorizationUrl: string) => void | Promise<void>;
  authProvider?: OAuthClientProvider;
};

export type McpServer = {
  name: string;
  config: RemoteMcpServerParameters | StdioServerParameters;
  status: "connected" | "connecting" | "disconnected";
  error?: string;
  tools?: McpTool[];
  resources?: McpResource[];
  resourceTemplates?: McpResourceTemplate[];
};

export type McpTool = ListToolsResult["tools"][number];

export type McpResource = {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
};

export type McpResourceTemplate = {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
};

export type McpResourceResponse = {
  _meta?: Record<string, any>;
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
};

export type McpServerEvents = {
  onLog: (
    type: "stderr" | "error",
    data: string,
    fullLog: string,
  ) => void | Promise<void>;
  onTransportClose: () => void;
};

export type RemoteMcpServerParameters = {
  url: string;
  headers?: Record<string, string>;
  requestInit?: RequestInit;
  OAuthEvents: {
    onPersistState: (state: StreamableHTTPOAuthState) => Promise<void>;
    onAuthRedirect: (authorizationUrl: string) => Promise<void>;
  };
  OAuthState: undefined | StreamableHTTPOAuthState;
  OAuthConfig: Pick<
    StreamableHTTPOAuthConfig,
    "clientSecret" | "redirectUri" | "scopes"
  > & {
    clientMetadataUrl: string | undefined;
  };
  RemoteServerEvents?: {
    onConnected?: (
      info: Awaited<ReturnType<typeof fetchRemoteMcpServerInfo>>,
    ) => Promise<void> | void;
  };
};

export type McpServerParametersWithEvents =
  | ({ type: "stdio" } & StdioServerParameters &
      Omit<McpServerEvents, "onTransportClose">)
  | ({ type: "remote" } & RemoteMcpServerParameters &
      Omit<McpServerEvents, "onTransportClose">);

export type McpServerParameters = McpServerParametersWithEvents & {
  server_name: string;
};
export type ServersConfig = Map<string, McpServerParameters>;

export const MCP_CLIENT_INFO = {
  name: "Prostgles",
  version: "1.0.0",
};
