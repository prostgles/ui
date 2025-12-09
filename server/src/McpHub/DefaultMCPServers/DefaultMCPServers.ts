import type { MCPServerInfo } from "@common/mcp";
import { mcpGithub } from "./mcpGithub";
import { ProstglesMCPServers } from "../ProstglesMcpHub/ProstglesMCPServers";

export const DefaultMCPServers: Record<
  string,
  Omit<MCPServerInfo, "mcp_server_tools">
> = {
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
      },
    },
  },
  searxng: {
    icon_path: "Web",
    command: "docker",
    args: [
      "run",
      "-i",
      "--rm",
      "-e",
      "SEARXNG_URL",
      "isokoliuk/mcp-searxng:latest",
    ],
    env: {
      SEARXNG_URL: "YOUR_SEARXNG_INSTANCE_URL",
    },
    config_schema: {
      SEARXNG_URL: {
        title: "SearXNG instance URL",
        description: "Example: http://localhost:8080",
        type: "env",
      },
    },
  },
  "brave-search": {
    icon_path: "Web",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: {
      BRAVE_API_KEY: "YOUR_API_KEY_HERE",
    },
    config_schema: {
      BRAVE_API_KEY: {
        title: "Brave API Key",
        description: "API key for Brave search",
        type: "env",
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
  ...ProstglesMCPServers,
};
