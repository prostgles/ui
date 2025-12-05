import type { MCPServerInfo } from "@common/mcp";
import { mcpGithub } from "./mcpGithub";

export const DefaultMCPServers: Record<
  string,
  Omit<MCPServerInfo, "mcp_server_tools">
> = {
  "duckduckgo-search": {
    icon_path: "Web",
    command: "uvx",
    args: ["duckduckgo-mcp-server"],
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
  gitlab: {
    icon_path: "Gitlab",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    env: {
      GITLAB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
      GITLAB_API_URL: "${default:https://gitlab.com/api/v4}",
    },
    config_schema: {
      GITLAB_PERSONAL_ACCESS_TOKEN: {
        title: "GitLab Personal Access Token",
        description: "Personal access token for GitLab",
        type: "env",
      },
      GITLAB_API_URL: {
        title: "GitLab API URL",
        description: "URL for the GitLab API",
        type: "env",
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
  puppeteer: {
    icon_path: "Web",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    env_from_main_process: ["DISPLAY"],
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
  sqlite: {
    command: "uv",
    args: [
      "--directory",
      "${dir:parent_of_servers_repo/servers/src/sqlite}",
      "run",
      "mcp-server-sqlite",
      "--db-path",
      "${path:~/test.db}",
    ],
    config_schema: {
      directory: {
        title: "Directory",
        description: "Directory path for SQLite database",
        type: "arg",
        index: 0,
      },
      dbPath: {
        title: "Database Path",
        description: "Path to the SQLite database",
        type: "arg",
        index: 1,
      },
    },
  },
  "docker-sandbox": {
    icon_path: "Docker",
    command: "prostgles-local",
    args: [],
  },
};

export const ProstglesLocalMCPServers = Object.keys(DefaultMCPServers).filter(
  (server) => DefaultMCPServers[server]?.command === "prostgles-local",
);
