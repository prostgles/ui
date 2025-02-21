export const MCP_SERVERS = {};

import type { DBSSchema } from "./publishUtils";

const mcpGithubUrl =
  "https://github.com/modelcontextprotocol/servers/tree/main/src";

export const DefaultMCPServers: Record<
  string,
  Omit<
    DBSSchema["mcp_servers"],
    | "id"
    | "created"
    | "cwd"
    | "config_schema"
    | "enabled"
    | "info"
    | "name"
    | "stderr"
    | "last_updated"
    | "env"
  > & {
    env?: Record<string, string>;
    mcp_server_tools?: Omit<
      DBSSchema["mcp_server_tools"],
      "id" | "server_name"
    >[];
  }
> = {
  "brave-search": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: {
      BRAVE_API_KEY: "YOUR_API_KEY_HERE",
    },
    github_url: `${mcpGithubUrl}/brave-search`,
  },
  fetch: {
    command: "uvx",
    args: ["mcp-server-fetch"],
    github_url: `${mcpGithubUrl}/fetch`,
  },
  filesystem: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "${dir:/path/to/other/allowed/dir}",
    ],
    github_url: `${mcpGithubUrl}/filesystem`,
  },
  git: {
    command: "uvx",
    args: ["mcp-server-git", "--repository", "${path:path/to/git/repo}"],
    github_url: `${mcpGithubUrl}/git`,
  },
  github: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
    },
    github_url: `${mcpGithubUrl}/github`,
  },
  gitlab: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    env: {
      GITLAB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
      GITLAB_API_URL: "${default:https://gitlab.com/api/v4}",
    },
    github_url: `${mcpGithubUrl}/gitlab`,
  },
  "google-maps": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-google-maps"],
    env: {
      GOOGLE_MAPS_API_KEY: "<YOUR_API_KEY>",
    },
    github_url: `${mcpGithubUrl}/google-maps`,
  },
  memory: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    github_url: `${mcpGithubUrl}/memory`,
  },
  postgres: {
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-postgres",
      "${text:postgresql://localhost/mydb}",
    ],
    github_url: `${mcpGithubUrl}/postgres`,
  },
  puppeteer: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    github_url: `${mcpGithubUrl}/puppeteer`,
    mcp_server_tools: [
      {
        name: "puppeteer_navigate",
        description: "Navigate to a URL",
        input_schema: {
          type: "object",
          properties: {
            url: {
              type: "string",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "puppeteer_screenshot",
        description:
          "Take a screenshot of the current page or a specific element",
        input_schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name for the screenshot",
            },
            selector: {
              type: "string",
              description: "CSS selector for element to screenshot",
            },
            width: {
              type: "number",
              description: "Width in pixels (default: 800)",
            },
            height: {
              type: "number",
              description: "Height in pixels (default: 600)",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "puppeteer_click",
        description: "Click an element on the page",
        input_schema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for element to click",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "puppeteer_fill",
        description: "Fill out an input field",
        input_schema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for input field",
            },
            value: {
              type: "string",
              description: "Value to fill",
            },
          },
          required: ["selector", "value"],
        },
      },
      {
        name: "puppeteer_select",
        description: "Select an element on the page with Select tag",
        input_schema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for element to select",
            },
            value: {
              type: "string",
              description: "Value to select",
            },
          },
          required: ["selector", "value"],
        },
      },
      {
        name: "puppeteer_hover",
        description: "Hover an element on the page",
        input_schema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for element to hover",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "puppeteer_evaluate",
        description: "Execute JavaScript in the browser console",
        input_schema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "JavaScript code to execute",
            },
          },
          required: ["script"],
        },
      },
    ],
  },
  sentry: {
    command: "uvx",
    args: ["mcp-server-sentry", "--auth-token", "${text:YOUR_SENTRY_TOKEN}"],
    github_url: `${mcpGithubUrl}/sentry`,
  },
  slack: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    env: {
      SLACK_BOT_TOKEN: "xoxb-your-bot-token",
      SLACK_TEAM_ID: "T01234567",
    },
    github_url: `${mcpGithubUrl}/slack`,
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
    github_url: `${mcpGithubUrl}/sqlite`,
  },
};
