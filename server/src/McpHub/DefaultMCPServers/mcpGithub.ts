import type { MCPServerInfo } from "../../../../common/mcp";

export const mcpGithub: MCPServerInfo = {
  icon_path: "Github",
  command: "docker",
  args: [
    "run",
    "-i",
    "--rm",
    "-e",
    "GITHUB_PERSONAL_ACCESS_TOKEN",
    "ghcr.io/github/github-mcp-server",
  ],
  config_schema: {
    GITHUB_PERSONAL_ACCESS_TOKEN: {
      type: "env",
      title: "GitHub Personal Access Token",
      description:
        "GitHub Personal Access Token to access private repositories. https://github.com/settings/personal-access-tokens",
      optional: false,
    },
  },
  mcp_server_tools: [
    {
      name: "add_issue_comment",
      description: "Add a comment to an existing issue",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "issue_number", "body"],
        properties: {
          body: {
            type: "string",
            description: "Comment text",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          issue_number: {
            type: "number",
            description: "Issue number to comment on",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "create_branch",
      description: "Create a new branch in a GitHub repository",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "branch"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          branch: {
            type: "string",
            description: "Name for new branch",
          },
          from_branch: {
            type: "string",
            description: "Source branch (defaults to repo default)",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "create_issue",
      description: "Create a new issue in a GitHub repository",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "title"],
        properties: {
          body: {
            type: "string",
            description: "Issue body content",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          title: {
            type: "string",
            description: "Issue title",
          },
          labels: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Labels to apply to this issue",
          },
          assignees: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Usernames to assign to this issue",
          },
          milestone: {
            type: "number",
            description: "Milestone number",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "create_or_update_file",
      description: "Create or update a single file in a GitHub repository",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "path", "content", "message", "branch"],
        properties: {
          sha: {
            type: "string",
            description: "SHA of file being replaced (for updates)",
          },
          path: {
            type: "string",
            description: "Path where to create/update the file",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner (username or organization)",
          },
          branch: {
            type: "string",
            description: "Branch to create/update the file in",
          },
          content: {
            type: "string",
            description: "Content of the file",
          },
          message: {
            type: "string",
            description: "Commit message",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "create_pull_request",
      description: "Create a new pull request in a GitHub repository",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "title", "head", "base"],
        properties: {
          base: {
            type: "string",
            description: "Branch to merge into",
          },
          body: {
            type: "string",
            description: "PR description",
          },
          head: {
            type: "string",
            description: "Branch containing changes",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          draft: {
            type: "boolean",
            description: "Create as draft PR",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          title: {
            type: "string",
            description: "PR title",
          },
          maintainer_can_modify: {
            type: "boolean",
            description: "Allow maintainer edits",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "create_pull_request_review",
      description: "Create a review on a pull request",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "pullNumber", "event"],
        properties: {
          body: {
            type: "string",
            description: "Review comment text",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          event: {
            type: "string",
            description:
              "Review action ('APPROVE', 'REQUEST_CHANGES', 'COMMENT')",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          comments: {
            type: "array",
            items: {
              type: "object",
              required: ["path", "position", "body"],
              properties: {
                body: {
                  type: "string",
                  description: "comment body",
                },
                path: {
                  type: "string",
                  description: "path to the file",
                },
                position: {
                  type: "number",
                  description: "line number in the file",
                },
              },
              additionalProperties: false,
            },
            description:
              "Line-specific comments array of objects, each object with path (string), position (number), and body (string)",
          },
          commitId: {
            type: "string",
            description: "SHA of commit to review",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "create_repository",
      description: "Create a new GitHub repository in your account",
      inputSchema: {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            description: "Repository name",
          },
          private: {
            type: "boolean",
            description: "Whether repo should be private",
          },
          autoInit: {
            type: "boolean",
            description: "Initialize with README",
          },
          description: {
            type: "string",
            description: "Repository description",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "fork_repository",
      description:
        "Fork a GitHub repository to your account or specified organization",
      inputSchema: {
        type: "object",
        required: ["owner", "repo"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          organization: {
            type: "string",
            description: "Organization to fork to",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_code_scanning_alert",
      description:
        "Get details of a specific code scanning alert in a GitHub repository.",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "alertNumber"],
        properties: {
          repo: {
            type: "string",
            description: "The name of the repository.",
          },
          owner: {
            type: "string",
            description: "The owner of the repository.",
          },
          alertNumber: {
            type: "number",
            description: "The number of the alert.",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_file_contents",
      description:
        "Get the contents of a file or directory from a GitHub repository",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "path"],
        properties: {
          path: {
            type: "string",
            description: "Path to file/directory",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner (username or organization)",
          },
          branch: {
            type: "string",
            description: "Branch to get contents from",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_issue",
      description: "Get details of a specific issue in a GitHub repository.",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "issue_number"],
        properties: {
          repo: {
            type: "string",
            description: "The name of the repository.",
          },
          owner: {
            type: "string",
            description: "The owner of the repository.",
          },
          issue_number: {
            type: "number",
            description: "The number of the issue.",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_me",
      description:
        'Get details of the authenticated GitHub user. Use this when a request include "me", "my"...',
      inputSchema: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Optional: reason the session was created",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_pull_request",
      description: "Get details of a specific pull request",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "pullNumber"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_pull_request_comments",
      description: "Get the review comments on a pull request",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "pullNumber"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_pull_request_files",
      description: "Get the list of files changed in a pull request",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "pullNumber"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_pull_request_reviews",
      description: "Get the reviews on a pull request",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "pullNumber"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "get_pull_request_status",
      description:
        "Get the combined status of all status checks for a pull request",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "pullNumber"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "list_code_scanning_alerts",
      description: "List code scanning alerts in a GitHub repository.",
      inputSchema: {
        type: "object",
        required: ["owner", "repo"],
        properties: {
          ref: {
            type: "string",
            description: "The Git reference for the results you want to list.",
          },
          repo: {
            type: "string",
            description: "The name of the repository.",
          },
          owner: {
            type: "string",
            description: "The owner of the repository.",
          },
          state: {
            type: "string",
            default: "open",
            description:
              "State of the code scanning alerts to list. Set to closed to list only closed code scanning alerts. Default: open",
          },
          severity: {
            type: "string",
            description:
              "Only code scanning alerts with this severity will be returned. Possible values are: critical, high, medium, low, warning, note, error.",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "list_commits",
      description: "Get list of commits of a branch in a GitHub repository",
      inputSchema: {
        type: "object",
        required: ["owner", "repo"],
        properties: {
          sha: {
            type: "string",
            description: "Branch name",
          },
          page: {
            type: "number",
            description: "Page number",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          perPage: {
            type: "number",
            description: "Number of records per page",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "list_issues",
      description: "List issues in a GitHub repository with filtering options",
      inputSchema: {
        type: "object",
        required: ["owner", "repo"],
        properties: {
          page: {
            type: "number",
            description: "Page number",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          sort: {
            enum: ["created", "updated", "comments"],
            type: "string",
            description: "Sort by ('created', 'updated', 'comments')",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          since: {
            type: "string",
            description: "Filter by date (ISO 8601 timestamp)",
          },
          state: {
            enum: ["open", "closed", "all"],
            type: "string",
            description: "Filter by state ('open', 'closed', 'all')",
          },
          labels: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Filter by labels",
          },
          per_page: {
            type: "number",
            description: "Results per page",
          },
          direction: {
            enum: ["asc", "desc"],
            type: "string",
            description: "Sort direction ('asc', 'desc')",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "list_pull_requests",
      description: "List and filter repository pull requests",
      inputSchema: {
        type: "object",
        required: ["owner", "repo"],
        properties: {
          base: {
            type: "string",
            description: "Filter by base branch",
          },
          head: {
            type: "string",
            description: "Filter by head user/org and branch",
          },
          page: {
            type: "number",
            description: "Page number",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          sort: {
            type: "string",
            description:
              "Sort by ('created', 'updated', 'popularity', 'long-running')",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          state: {
            type: "string",
            description: "Filter by state ('open', 'closed', 'all')",
          },
          per_page: {
            type: "number",
            description: "Results per page (max 100)",
          },
          direction: {
            type: "string",
            description: "Sort direction ('asc', 'desc')",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "merge_pull_request",
      description: "Merge a pull request",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "pullNumber"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
          commit_title: {
            type: "string",
            description: "Title for merge commit",
          },
          merge_method: {
            type: "string",
            description: "Merge method ('merge', 'squash', 'rebase')",
          },
          commit_message: {
            type: "string",
            description: "Extra detail for merge commit",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "push_files",
      description:
        "Push multiple files to a GitHub repository in a single commit",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "branch", "files", "message"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          files: {
            type: "array",
            items: {
              type: "object",
              required: ["path", "content"],
              properties: {
                path: {
                  type: "string",
                  description: "path to the file",
                },
                content: {
                  type: "string",
                  description: "file content",
                },
              },
              additionalProperties: false,
            },
            description:
              "Array of file objects to push, each object with path (string) and content (string)",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          branch: {
            type: "string",
            description: "Branch to push to",
          },
          message: {
            type: "string",
            description: "Commit message",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "search_code",
      description: "Search for code across GitHub repositories",
      inputSchema: {
        type: "object",
        required: ["q"],
        properties: {
          q: {
            type: "string",
            description: "Search query using GitHub code search syntax",
          },
          page: {
            type: "number",
            minimum: 1,
            description: "Page number",
          },
          sort: {
            type: "string",
            description: "Sort field ('indexed' only)",
          },
          order: {
            enum: ["asc", "desc"],
            type: "string",
            description: "Sort order ('asc' or 'desc')",
          },
          per_page: {
            type: "number",
            maximum: 100,
            minimum: 1,
            description: "Results per page (max 100)",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "search_issues",
      description:
        "Search for issues and pull requests across GitHub repositories",
      inputSchema: {
        type: "object",
        required: ["q"],
        properties: {
          q: {
            type: "string",
            description: "Search query using GitHub issues search syntax",
          },
          page: {
            type: "number",
            minimum: 1,
            description: "Page number",
          },
          sort: {
            enum: [
              "comments",
              "reactions",
              "reactions-+1",
              "reactions--1",
              "reactions-smile",
              "reactions-thinking_face",
              "reactions-heart",
              "reactions-tada",
              "interactions",
              "created",
              "updated",
            ],
            type: "string",
            description: "Sort field (comments, reactions, created, etc.)",
          },
          order: {
            enum: ["asc", "desc"],
            type: "string",
            description: "Sort order ('asc' or 'desc')",
          },
          per_page: {
            type: "number",
            maximum: 100,
            minimum: 1,
            description: "Results per page (max 100)",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "search_repositories",
      description: "Search for GitHub repositories",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          page: {
            type: "number",
            description: "Page number for pagination",
          },
          query: {
            type: "string",
            description: "Search query",
          },
          perPage: {
            type: "number",
            description: "Results per page (max 100)",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "search_users",
      description: "Search for GitHub users",
      inputSchema: {
        type: "object",
        required: ["q"],
        properties: {
          q: {
            type: "string",
            description: "Search query using GitHub users search syntax",
          },
          page: {
            type: "number",
            minimum: 1,
            description: "Page number",
          },
          sort: {
            enum: ["followers", "repositories", "joined"],
            type: "string",
            description: "Sort field (followers, repositories, joined)",
          },
          order: {
            enum: ["asc", "desc"],
            type: "string",
            description: "Sort order ('asc' or 'desc')",
          },
          per_page: {
            type: "number",
            maximum: 100,
            minimum: 1,
            description: "Results per page (max 100)",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "update_issue",
      description: "Update an existing issue in a GitHub repository",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "issue_number"],
        properties: {
          body: {
            type: "string",
            description: "New description",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          state: {
            enum: ["open", "closed"],
            type: "string",
            description: "New state ('open' or 'closed')",
          },
          title: {
            type: "string",
            description: "New title",
          },
          labels: {
            type: "array",
            items: {
              type: "string",
            },
            description: "New labels",
          },
          assignees: {
            type: "array",
            items: {
              type: "string",
            },
            description: "New assignees",
          },
          milestone: {
            type: "number",
            description: "New milestone number",
          },
          issue_number: {
            type: "number",
            description: "Issue number to update",
          },
        },
      },
      autoApprove: false,
    },
    {
      name: "update_pull_request_branch",
      description:
        "Update a pull request branch with the latest changes from the base branch",
      inputSchema: {
        type: "object",
        required: ["owner", "repo", "pullNumber"],
        properties: {
          repo: {
            type: "string",
            description: "Repository name",
          },
          owner: {
            type: "string",
            description: "Repository owner",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
          expectedHeadSha: {
            type: "string",
            description: "The expected SHA of the pull request's HEAD ref",
          },
        },
      },
      autoApprove: false,
    },
  ],
};
