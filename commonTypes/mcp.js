export const MCP_SERVERS = {};
const mcpGithubUrl = "https://github.com/modelcontextprotocol/servers/tree/main/src";
export const DefaultMCPServers = {
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
