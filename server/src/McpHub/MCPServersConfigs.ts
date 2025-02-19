import type { DBSSchema } from "../../../commonTypes/publishUtils";

export const DefaultMCPServers: Record<
  string,
  | any
  | (Omit<
      DBSSchema["mcp_servers"],
      | "id"
      | "created"
      | "cwd"
      | "config_schema"
      | "github_url"
      | "info"
      | "name"
      | "stderr"
      | "last_updated"
      | "env"
    > & { env?: Record<string, string> })
> = {
  "brave-search": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: {
      BRAVE_API_KEY: "YOUR_API_KEY_HERE",
    },
  },
  fetch: {
    command: "uvx",
    args: ["mcp-server-fetch"],
  },
  filesystem: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "${dir:/path/to/other/allowed/dir}",
    ],
  },
  git: {
    command: "uvx",
    args: ["mcp-server-git", "--repository", "${path:path/to/git/repo}"],
  },
  github: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
    },
  },
  gitlab: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    env: {
      GITLAB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
      GITLAB_API_URL: "${default:https://gitlab.com/api/v4}",
    },
  },
  "google-maps": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-google-maps"],
    env: {
      GOOGLE_MAPS_API_KEY: "<YOUR_API_KEY>",
    },
  },
  memory: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
  },
  postgres: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-postgres",
      "${text:postgresql://localhost/mydb}",
    ],
  },
  puppeteer: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
  },
  sentry: {
    command: "uvx",
    args: ["mcp-server-sentry", "--auth-token", "${text:YOUR_SENTRY_TOKEN}"],
  },
  slack: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    env: {
      SLACK_BOT_TOKEN: "xoxb-your-bot-token",
      SLACK_TEAM_ID: "T01234567",
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
  },
};
