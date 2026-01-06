import type { DEFAULT_MCP_SERVER_NAMES, MCPServerInfo } from "@common/mcp";
import { mcpGithub } from "./mcpGithub";
import { ProstglesMCPServers } from "../ProstglesMcpHub/ProstglesMCPServers";
import { fromEntries, getEntries } from "@common/utils";

export const getDefaultMCPServers = (): Record<
  (typeof DEFAULT_MCP_SERVER_NAMES)[number],
  MCPServerInfo
> => ({
  filesystem: {
    icon_path: "FolderOutline",
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "${dir:/path/to/other/allowed/dir}",
    ],
    config_schema: {
      allowedDir: {
        title: "Allowed Directory",
        description: "Directory path to allow access to",
        type: "arg",
        renderWithComponent: "FileBrowser",
      },
    },
  },
  fetch: {
    icon_path: "Web",
    command: "uvx",
    args: ["mcp-server-fetch"],
  },
  git: {
    icon_path: "Git",
    command: "uvx",
    args: ["mcp-server-git", "--repository", "${path:path/to/git/repo}"],
    config_schema: {
      repoPath: {
        title: "Repository Path",
        description: "Path to the git repository",
        type: "arg",
      },
    },
  },
  github: mcpGithub,
  "google-maps": {
    icon_path: "GoogleMaps",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-google-maps"],
    env: {
      GOOGLE_MAPS_API_KEY: "<YOUR_API_KEY>",
    },
    config_schema: {
      GOOGLE_MAPS_API_KEY: {
        title: "Google Maps API Key",
        description: "API key for Google Maps",
        type: "env",
      },
    },
  },
  memory: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
  },
  playwright: {
    icon_path: "Web",
    command: "npx",
    args: ["@playwright/mcp@latest"],
  },
  slack: {
    icon_path: "Slack",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    env: {
      SLACK_BOT_TOKEN: "xoxb-your-bot-token",
      SLACK_TEAM_ID: "T01234567",
    },
    config_schema: {
      SLACK_BOT_TOKEN: {
        title: "Slack Bot Token",
        description: "Bot token for Slack",
        type: "env",
      },
      SLACK_TEAM_ID: {
        title: "Slack Team ID",
        description: "Team ID for Slack",
        type: "env",
      },
    },
  },
  ...fromEntries(
    getEntries(ProstglesMCPServers).map(
      ([
        serverName,
        {
          definition: { icon_path, tools },
        },
      ]) => [
        serverName,
        {
          command: "prostgles-local",
          config_schema: undefined,
          icon_path,
          mcp_server_tools: getEntries(tools).map(
            ([name, { schema, description }]) => ({
              name,
              description,
              inputSchema: schema,
            }),
          ),
        } satisfies MCPServerInfo,
      ],
    ),
  ),
});
