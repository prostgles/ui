import type { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio";

export type McpMode = "full" | "server-use-only" | "off";

export type McpServer = {
  name: string;
  config: StdioServerParameters;
  status: "connected" | "connecting" | "disconnected";
  error?: string;
  tools?: McpTool[];
  resources?: McpResource[];
  resourceTemplates?: McpResourceTemplate[];
  disabled?: boolean;
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: object;
  autoApprove?: boolean;
};

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

export interface McpMarketplaceItem {
  mcpId: string;
  githubUrl: string;
  name: string;
  author: string;
  description: string;
  codiconIcon: string;
  logoUrl: string;
  category: string;
  tags: string[];
  requiresApiKey: boolean;
  readmeContent?: string;
  llmsInstallationContent?: string;
  isRecommended: boolean;
  githubStars: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  lastGithubSync: string;
}

export interface McpMarketplaceCatalog {
  items: McpMarketplaceItem[];
}

export interface McpDownloadResponse {
  mcpId: string;
  githubUrl: string;
  name: string;
  author: string;
  description: string;
  readmeContent: string;
  llmsInstallationContent: string;
  requiresApiKey: boolean;
}

export type McpServerEvents = {
  onLog: (
    type: "stderr" | "error",
    data: string,
    fullLog: string,
  ) => void | Promise<void>;
  onTransportClose: () => void;
};

export type McpConfigWithEvents = StdioServerParameters & McpServerEvents;

export type ServersConfig = Record<
  string,
  Omit<McpConfigWithEvents, "onTransportClose">
>;
