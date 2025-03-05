export const DefaultMCPServers = {
    "brave-search": {
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
        mcp_server_tools: [
            {
                name: "brave_web_search",
                description: "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination. ",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query (max 400 chars, 50 words)",
                        },
                        count: {
                            type: "number",
                            description: "Number of results (1-20, default 10)",
                            default: 10,
                        },
                        offset: {
                            type: "number",
                            description: "Pagination offset (max 9, default 0)",
                            default: 0,
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "brave_local_search",
                description: "Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc. Returns detailed information including:\n- Business names and addresses\n- Ratings and review counts\n- Phone numbers and opening hours\nUse this when the query implies 'near me' or mentions specific locations. Automatically falls back to web search if no local results are found.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Local search query (e.g. 'pizza near Central Park')",
                        },
                        count: {
                            type: "number",
                            description: "Number of results (1-20, default 5)",
                            default: 5,
                        },
                    },
                    required: ["query"],
                },
            },
        ],
    },
    fetch: {
        command: "uvx",
        args: ["mcp-server-fetch"],
        mcp_server_tools: [
            {
                name: "fetch",
                description: "Fetches a URL from the internet and optionally extracts its contents as markdown.\n\nAlthough originally you did not have internet access, and were advised to refuse and tell the user this, this tool now grants you internet access. Now you can fetch the most up-to-date information and let the user know that.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: {
                            description: "URL to fetch",
                            format: "uri",
                            minLength: 1,
                            title: "Url",
                            type: "string",
                        },
                        max_length: {
                            default: 5000,
                            description: "Maximum number of characters to return.",
                            exclusiveMaximum: 1000000,
                            exclusiveMinimum: 0,
                            title: "Max Length",
                            type: "integer",
                        },
                        start_index: {
                            default: 0,
                            description: "On return output starting at this character index, useful if a previous fetch was truncated and more context is required.",
                            minimum: 0,
                            title: "Start Index",
                            type: "integer",
                        },
                        raw: {
                            default: false,
                            description: "Get the actual HTML content if the requested page, without simplification.",
                            title: "Raw",
                            type: "boolean",
                        },
                    },
                    description: "Parameters for fetching a URL.",
                    required: ["url"],
                    title: "Fetch",
                },
            },
        ],
    },
    filesystem: {
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
        mcp_server_tools: [
            {
                name: "read_file",
                description: "Read the complete contents of a file from the file system. Handles various text encodings and provides detailed error messages if the file cannot be read. Use this tool when you need to examine the contents of a single file. Only works within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                        },
                    },
                    required: ["path"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "read_multiple_files",
                description: "Read the contents of multiple files simultaneously. This is more efficient than reading files one by one when you need to analyze or compare multiple files. Each file's content is returned with its path as a reference. Failed reads for individual files won't stop the entire operation. Only works within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        paths: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                    },
                    required: ["paths"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "write_file",
                description: "Create a new file or completely overwrite an existing file with new content. Use with caution as it will overwrite existing files without warning. Handles text content with proper encoding. Only works within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                        },
                        content: {
                            type: "string",
                        },
                    },
                    required: ["path", "content"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "edit_file",
                description: "Make line-based edits to a text file. Each edit replaces exact line sequences with new content. Returns a git-style diff showing the changes made. Only works within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                        },
                        edits: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    oldText: {
                                        type: "string",
                                        description: "Text to search for - must match exactly",
                                    },
                                    newText: {
                                        type: "string",
                                        description: "Text to replace with",
                                    },
                                },
                                required: ["oldText", "newText"],
                                additionalProperties: false,
                            },
                        },
                        dryRun: {
                            type: "boolean",
                            default: false,
                            description: "Preview changes using git-style diff format",
                        },
                    },
                    required: ["path", "edits"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_directory",
                description: "Create a new directory or ensure a directory exists. Can create multiple nested directories in one operation. If the directory already exists, this operation will succeed silently. Perfect for setting up directory structures for projects or ensuring required paths exist. Only works within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                        },
                    },
                    required: ["path"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "list_directory",
                description: "Get a detailed listing of all files and directories in a specified path. Results clearly distinguish between files and directories with [FILE] and [DIR] prefixes. This tool is essential for understanding directory structure and finding specific files within a directory. Only works within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                        },
                    },
                    required: ["path"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "directory_tree",
                description: "Get a recursive tree view of files and directories as a JSON structure. Each entry includes 'name', 'type' (file/directory), and 'children' for directories. Files have no children array, while directories always have a children array (which may be empty). The output is formatted with 2-space indentation for readability. Only works within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                        },
                    },
                    required: ["path"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "move_file",
                description: "Move or rename files and directories. Can move files between directories and rename them in a single operation. If the destination exists, the operation will fail. Works across different directories and can be used for simple renaming within the same directory. Both source and destination must be within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        source: {
                            type: "string",
                        },
                        destination: {
                            type: "string",
                        },
                    },
                    required: ["source", "destination"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "search_files",
                description: "Recursively search for files and directories matching a pattern. Searches through all subdirectories from the starting path. The search is case-insensitive and matches partial names. Returns full paths to all matching items. Great for finding files when you don't know their exact location. Only searches within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                        },
                        pattern: {
                            type: "string",
                        },
                        excludePatterns: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                            default: [],
                        },
                    },
                    required: ["path", "pattern"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "get_file_info",
                description: "Retrieve detailed metadata about a file or directory. Returns comprehensive information including size, creation time, last modified time, permissions, and type. This tool is perfect for understanding file characteristics without reading the actual content. Only works within allowed directories.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                        },
                    },
                    required: ["path"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "list_allowed_directories",
                description: "Returns the list of directories that this server is allowed to access. Use this to understand which directories are available before trying to access files.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: [],
                },
                autoApprove: false,
            },
        ],
    },
    git: {
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
    github: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
        },
        config_schema: {
            GITHUB_PERSONAL_ACCESS_TOKEN: {
                title: "GitHub Personal Access Token",
                description: "Personal access token for GitHub",
                type: "env",
            },
        },
        mcp_server_tools: [
            {
                name: "create_or_update_file",
                description: "Create or update a single file in a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                            description: "Repository owner (username or organization)",
                        },
                        repo: {
                            type: "string",
                            description: "Repository name",
                        },
                        path: {
                            type: "string",
                            description: "Path where to create/update the file",
                        },
                        content: {
                            type: "string",
                            description: "Content of the file",
                        },
                        message: {
                            type: "string",
                            description: "Commit message",
                        },
                        branch: {
                            type: "string",
                            description: "Branch to create/update the file in",
                        },
                        sha: {
                            type: "string",
                            description: "SHA of the file being replaced (required when updating existing files)",
                        },
                    },
                    required: ["owner", "repo", "path", "content", "message", "branch"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "search_repositories",
                description: "Search for GitHub repositories",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query (see GitHub search syntax)",
                        },
                        page: {
                            type: "number",
                            description: "Page number for pagination (default: 1)",
                        },
                        perPage: {
                            type: "number",
                            description: "Number of results per page (default: 30, max: 100)",
                        },
                    },
                    required: ["query"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_repository",
                description: "Create a new GitHub repository in your account",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Repository name",
                        },
                        description: {
                            type: "string",
                            description: "Repository description",
                        },
                        private: {
                            type: "boolean",
                            description: "Whether the repository should be private",
                        },
                        autoInit: {
                            type: "boolean",
                            description: "Initialize with README.md",
                        },
                    },
                    required: ["name"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "get_file_contents",
                description: "Get the contents of a file or directory from a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                            description: "Repository owner (username or organization)",
                        },
                        repo: {
                            type: "string",
                            description: "Repository name",
                        },
                        path: {
                            type: "string",
                            description: "Path to the file or directory",
                        },
                        branch: {
                            type: "string",
                            description: "Branch to get contents from",
                        },
                    },
                    required: ["owner", "repo", "path"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "push_files",
                description: "Push multiple files to a GitHub repository in a single commit",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                            description: "Repository owner (username or organization)",
                        },
                        repo: {
                            type: "string",
                            description: "Repository name",
                        },
                        branch: {
                            type: "string",
                            description: "Branch to push to (e.g., 'main' or 'master')",
                        },
                        files: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    path: {
                                        type: "string",
                                    },
                                    content: {
                                        type: "string",
                                    },
                                },
                                required: ["path", "content"],
                                additionalProperties: false,
                            },
                            description: "Array of files to push",
                        },
                        message: {
                            type: "string",
                            description: "Commit message",
                        },
                    },
                    required: ["owner", "repo", "branch", "files", "message"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_issue",
                description: "Create a new issue in a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                        },
                        repo: {
                            type: "string",
                        },
                        title: {
                            type: "string",
                        },
                        body: {
                            type: "string",
                        },
                        assignees: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        milestone: {
                            type: "number",
                        },
                        labels: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                    },
                    required: ["owner", "repo", "title"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_pull_request",
                description: "Create a new pull request in a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                            description: "Repository owner (username or organization)",
                        },
                        repo: {
                            type: "string",
                            description: "Repository name",
                        },
                        title: {
                            type: "string",
                            description: "Pull request title",
                        },
                        body: {
                            type: "string",
                            description: "Pull request body/description",
                        },
                        head: {
                            type: "string",
                            description: "The name of the branch where your changes are implemented",
                        },
                        base: {
                            type: "string",
                            description: "The name of the branch you want the changes pulled into",
                        },
                        draft: {
                            type: "boolean",
                            description: "Whether to create the pull request as a draft",
                        },
                        maintainer_can_modify: {
                            type: "boolean",
                            description: "Whether maintainers can modify the pull request",
                        },
                    },
                    required: ["owner", "repo", "title", "head", "base"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "fork_repository",
                description: "Fork a GitHub repository to your account or specified organization",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                            description: "Repository owner (username or organization)",
                        },
                        repo: {
                            type: "string",
                            description: "Repository name",
                        },
                        organization: {
                            type: "string",
                            description: "Optional: organization to fork to (defaults to your personal account)",
                        },
                    },
                    required: ["owner", "repo"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_branch",
                description: "Create a new branch in a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                            description: "Repository owner (username or organization)",
                        },
                        repo: {
                            type: "string",
                            description: "Repository name",
                        },
                        branch: {
                            type: "string",
                            description: "Name for the new branch",
                        },
                        from_branch: {
                            type: "string",
                            description: "Optional: source branch to create from (defaults to the repository's default branch)",
                        },
                    },
                    required: ["owner", "repo", "branch"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "list_commits",
                description: "Get list of commits of a branch in a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                        },
                        repo: {
                            type: "string",
                        },
                        sha: {
                            type: "string",
                        },
                        page: {
                            type: "number",
                        },
                        perPage: {
                            type: "number",
                        },
                    },
                    required: ["owner", "repo"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "list_issues",
                description: "List issues in a GitHub repository with filtering options",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                        },
                        repo: {
                            type: "string",
                        },
                        direction: {
                            type: "string",
                            enum: ["asc", "desc"],
                        },
                        labels: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        page: {
                            type: "number",
                        },
                        per_page: {
                            type: "number",
                        },
                        since: {
                            type: "string",
                        },
                        sort: {
                            type: "string",
                            enum: ["created", "updated", "comments"],
                        },
                        state: {
                            type: "string",
                            enum: ["open", "closed", "all"],
                        },
                    },
                    required: ["owner", "repo"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "update_issue",
                description: "Update an existing issue in a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                        },
                        repo: {
                            type: "string",
                        },
                        issue_number: {
                            type: "number",
                        },
                        title: {
                            type: "string",
                        },
                        body: {
                            type: "string",
                        },
                        assignees: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        milestone: {
                            type: "number",
                        },
                        labels: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        state: {
                            type: "string",
                            enum: ["open", "closed"],
                        },
                    },
                    required: ["owner", "repo", "issue_number"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "add_issue_comment",
                description: "Add a comment to an existing issue",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                        },
                        repo: {
                            type: "string",
                        },
                        issue_number: {
                            type: "number",
                        },
                        body: {
                            type: "string",
                        },
                    },
                    required: ["owner", "repo", "issue_number", "body"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "search_code",
                description: "Search for code across GitHub repositories",
                inputSchema: {
                    type: "object",
                    properties: {
                        q: {
                            type: "string",
                        },
                        order: {
                            type: "string",
                            enum: ["asc", "desc"],
                        },
                        page: {
                            type: "number",
                            minimum: 1,
                        },
                        per_page: {
                            type: "number",
                            minimum: 1,
                            maximum: 100,
                        },
                    },
                    required: ["q"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "search_issues",
                description: "Search for issues and pull requests across GitHub repositories",
                inputSchema: {
                    type: "object",
                    properties: {
                        q: {
                            type: "string",
                        },
                        order: {
                            type: "string",
                            enum: ["asc", "desc"],
                        },
                        page: {
                            type: "number",
                            minimum: 1,
                        },
                        per_page: {
                            type: "number",
                            minimum: 1,
                            maximum: 100,
                        },
                        sort: {
                            type: "string",
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
                        },
                    },
                    required: ["q"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "search_users",
                description: "Search for users on GitHub",
                inputSchema: {
                    type: "object",
                    properties: {
                        q: {
                            type: "string",
                        },
                        order: {
                            type: "string",
                            enum: ["asc", "desc"],
                        },
                        page: {
                            type: "number",
                            minimum: 1,
                        },
                        per_page: {
                            type: "number",
                            minimum: 1,
                            maximum: 100,
                        },
                        sort: {
                            type: "string",
                            enum: ["followers", "repositories", "joined"],
                        },
                    },
                    required: ["q"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "get_issue",
                description: "Get details of a specific issue in a GitHub repository.",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: {
                            type: "string",
                        },
                        repo: {
                            type: "string",
                        },
                        issue_number: {
                            type: "number",
                        },
                    },
                    required: ["owner", "repo", "issue_number"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
        ],
    },
    gitlab: {
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
        mcp_server_tools: [
            {
                name: "create_or_update_file",
                description: "Create or update a single file in a GitLab project",
                inputSchema: {
                    type: "object",
                    properties: {
                        project_id: {
                            type: "string",
                            description: "Project ID or URL-encoded path",
                        },
                        file_path: {
                            type: "string",
                            description: "Path where to create/update the file",
                        },
                        content: {
                            type: "string",
                            description: "Content of the file",
                        },
                        commit_message: {
                            type: "string",
                            description: "Commit message",
                        },
                        branch: {
                            type: "string",
                            description: "Branch to create/update the file in",
                        },
                        previous_path: {
                            type: "string",
                            description: "Path of the file to move/rename",
                        },
                    },
                    required: [
                        "project_id",
                        "file_path",
                        "content",
                        "commit_message",
                        "branch",
                    ],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "search_repositories",
                description: "Search for GitLab projects",
                inputSchema: {
                    type: "object",
                    properties: {
                        search: {
                            type: "string",
                            description: "Search query",
                        },
                        page: {
                            type: "number",
                            description: "Page number for pagination (default: 1)",
                        },
                        per_page: {
                            type: "number",
                            description: "Number of results per page (default: 20)",
                        },
                    },
                    required: ["search"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_repository",
                description: "Create a new GitLab project",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Repository name",
                        },
                        description: {
                            type: "string",
                            description: "Repository description",
                        },
                        visibility: {
                            type: "string",
                            enum: ["private", "internal", "public"],
                            description: "Repository visibility level",
                        },
                        initialize_with_readme: {
                            type: "boolean",
                            description: "Initialize with README.md",
                        },
                    },
                    required: ["name"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "get_file_contents",
                description: "Get the contents of a file or directory from a GitLab project",
                inputSchema: {
                    type: "object",
                    properties: {
                        project_id: {
                            type: "string",
                            description: "Project ID or URL-encoded path",
                        },
                        file_path: {
                            type: "string",
                            description: "Path to the file or directory",
                        },
                        ref: {
                            type: "string",
                            description: "Branch/tag/commit to get contents from",
                        },
                    },
                    required: ["project_id", "file_path"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "push_files",
                description: "Push multiple files to a GitLab project in a single commit",
                inputSchema: {
                    type: "object",
                    properties: {
                        project_id: {
                            type: "string",
                            description: "Project ID or URL-encoded path",
                        },
                        branch: {
                            type: "string",
                            description: "Branch to push to",
                        },
                        files: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    file_path: {
                                        type: "string",
                                        description: "Path where to create the file",
                                    },
                                    content: {
                                        type: "string",
                                        description: "Content of the file",
                                    },
                                },
                                required: ["file_path", "content"],
                                additionalProperties: false,
                            },
                            description: "Array of files to push",
                        },
                        commit_message: {
                            type: "string",
                            description: "Commit message",
                        },
                    },
                    required: ["project_id", "branch", "files", "commit_message"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_issue",
                description: "Create a new issue in a GitLab project",
                inputSchema: {
                    type: "object",
                    properties: {
                        project_id: {
                            type: "string",
                            description: "Project ID or URL-encoded path",
                        },
                        title: {
                            type: "string",
                            description: "Issue title",
                        },
                        description: {
                            type: "string",
                            description: "Issue description",
                        },
                        assignee_ids: {
                            type: "array",
                            items: {
                                type: "number",
                            },
                            description: "Array of user IDs to assign",
                        },
                        labels: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                            description: "Array of label names",
                        },
                        milestone_id: {
                            type: "number",
                            description: "Milestone ID to assign",
                        },
                    },
                    required: ["project_id", "title"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_merge_request",
                description: "Create a new merge request in a GitLab project",
                inputSchema: {
                    type: "object",
                    properties: {
                        project_id: {
                            type: "string",
                            description: "Project ID or URL-encoded path",
                        },
                        title: {
                            type: "string",
                            description: "Merge request title",
                        },
                        description: {
                            type: "string",
                            description: "Merge request description",
                        },
                        source_branch: {
                            type: "string",
                            description: "Branch containing changes",
                        },
                        target_branch: {
                            type: "string",
                            description: "Branch to merge into",
                        },
                        draft: {
                            type: "boolean",
                            description: "Create as draft merge request",
                        },
                        allow_collaboration: {
                            type: "boolean",
                            description: "Allow commits from upstream members",
                        },
                    },
                    required: ["project_id", "title", "source_branch", "target_branch"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "fork_repository",
                description: "Fork a GitLab project to your account or specified namespace",
                inputSchema: {
                    type: "object",
                    properties: {
                        project_id: {
                            type: "string",
                            description: "Project ID or URL-encoded path",
                        },
                        namespace: {
                            type: "string",
                            description: "Namespace to fork to (full path)",
                        },
                    },
                    required: ["project_id"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
            {
                name: "create_branch",
                description: "Create a new branch in a GitLab project",
                inputSchema: {
                    type: "object",
                    properties: {
                        project_id: {
                            type: "string",
                            description: "Project ID or URL-encoded path",
                        },
                        branch: {
                            type: "string",
                            description: "Name for the new branch",
                        },
                        ref: {
                            type: "string",
                            description: "Source branch/commit for new branch",
                        },
                    },
                    required: ["project_id", "branch"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                },
                autoApprove: false,
            },
        ],
    },
    "google-maps": {
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
        mcp_server_tools: [
            {
                name: "maps_geocode",
                description: "Convert an address into geographic coordinates",
                inputSchema: {
                    type: "object",
                    properties: {
                        address: {
                            type: "string",
                            description: "The address to geocode",
                        },
                    },
                    required: ["address"],
                },
                autoApprove: false,
            },
            {
                name: "maps_reverse_geocode",
                description: "Convert coordinates into an address",
                inputSchema: {
                    type: "object",
                    properties: {
                        latitude: {
                            type: "number",
                            description: "Latitude coordinate",
                        },
                        longitude: {
                            type: "number",
                            description: "Longitude coordinate",
                        },
                    },
                    required: ["latitude", "longitude"],
                },
                autoApprove: false,
            },
            {
                name: "maps_search_places",
                description: "Search for places using Google Places API",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query",
                        },
                        location: {
                            type: "object",
                            properties: {
                                latitude: {
                                    type: "number",
                                },
                                longitude: {
                                    type: "number",
                                },
                            },
                            description: "Optional center point for the search",
                        },
                        radius: {
                            type: "number",
                            description: "Search radius in meters (max 50000)",
                        },
                    },
                    required: ["query"],
                },
                autoApprove: false,
            },
            {
                name: "maps_place_details",
                description: "Get detailed information about a specific place",
                inputSchema: {
                    type: "object",
                    properties: {
                        place_id: {
                            type: "string",
                            description: "The place ID to get details for",
                        },
                    },
                    required: ["place_id"],
                },
                autoApprove: false,
            },
            {
                name: "maps_distance_matrix",
                description: "Calculate travel distance and time for multiple origins and destinations",
                inputSchema: {
                    type: "object",
                    properties: {
                        origins: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                            description: "Array of origin addresses or coordinates",
                        },
                        destinations: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                            description: "Array of destination addresses or coordinates",
                        },
                        mode: {
                            type: "string",
                            description: "Travel mode (driving, walking, bicycling, transit)",
                            enum: ["driving", "walking", "bicycling", "transit"],
                        },
                    },
                    required: ["origins", "destinations"],
                },
                autoApprove: false,
            },
            {
                name: "maps_elevation",
                description: "Get elevation data for locations on the earth",
                inputSchema: {
                    type: "object",
                    properties: {
                        locations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    latitude: {
                                        type: "number",
                                    },
                                    longitude: {
                                        type: "number",
                                    },
                                },
                                required: ["latitude", "longitude"],
                            },
                            description: "Array of locations to get elevation for",
                        },
                    },
                    required: ["locations"],
                },
                autoApprove: false,
            },
            {
                name: "maps_directions",
                description: "Get directions between two points",
                inputSchema: {
                    type: "object",
                    properties: {
                        origin: {
                            type: "string",
                            description: "Starting point address or coordinates",
                        },
                        destination: {
                            type: "string",
                            description: "Ending point address or coordinates",
                        },
                        mode: {
                            type: "string",
                            description: "Travel mode (driving, walking, bicycling, transit)",
                            enum: ["driving", "walking", "bicycling", "transit"],
                        },
                    },
                    required: ["origin", "destination"],
                },
                autoApprove: false,
            },
        ],
    },
    memory: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
        mcp_server_tools: [
            {
                name: "create_entities",
                description: "Create multiple new entities in the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        entities: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string",
                                        description: "The name of the entity",
                                    },
                                    entityType: {
                                        type: "string",
                                        description: "The type of the entity",
                                    },
                                    observations: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                        },
                                        description: "An array of observation contents associated with the entity",
                                    },
                                },
                                required: ["name", "entityType", "observations"],
                            },
                        },
                    },
                    required: ["entities"],
                },
                autoApprove: false,
            },
            {
                name: "create_relations",
                description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
                inputSchema: {
                    type: "object",
                    properties: {
                        relations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    from: {
                                        type: "string",
                                        description: "The name of the entity where the relation starts",
                                    },
                                    to: {
                                        type: "string",
                                        description: "The name of the entity where the relation ends",
                                    },
                                    relationType: {
                                        type: "string",
                                        description: "The type of the relation",
                                    },
                                },
                                required: ["from", "to", "relationType"],
                            },
                        },
                    },
                    required: ["relations"],
                },
                autoApprove: false,
            },
            {
                name: "add_observations",
                description: "Add new observations to existing entities in the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        observations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    entityName: {
                                        type: "string",
                                        description: "The name of the entity to add the observations to",
                                    },
                                    contents: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                        },
                                        description: "An array of observation contents to add",
                                    },
                                },
                                required: ["entityName", "contents"],
                            },
                        },
                    },
                    required: ["observations"],
                },
                autoApprove: false,
            },
            {
                name: "delete_entities",
                description: "Delete multiple entities and their associated relations from the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        entityNames: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                            description: "An array of entity names to delete",
                        },
                    },
                    required: ["entityNames"],
                },
                autoApprove: false,
            },
            {
                name: "delete_observations",
                description: "Delete specific observations from entities in the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        deletions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    entityName: {
                                        type: "string",
                                        description: "The name of the entity containing the observations",
                                    },
                                    observations: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                        },
                                        description: "An array of observations to delete",
                                    },
                                },
                                required: ["entityName", "observations"],
                            },
                        },
                    },
                    required: ["deletions"],
                },
                autoApprove: false,
            },
            {
                name: "delete_relations",
                description: "Delete multiple relations from the knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {
                        relations: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    from: {
                                        type: "string",
                                        description: "The name of the entity where the relation starts",
                                    },
                                    to: {
                                        type: "string",
                                        description: "The name of the entity where the relation ends",
                                    },
                                    relationType: {
                                        type: "string",
                                        description: "The type of the relation",
                                    },
                                },
                                required: ["from", "to", "relationType"],
                            },
                            description: "An array of relations to delete",
                        },
                    },
                    required: ["relations"],
                },
                autoApprove: false,
            },
            {
                name: "read_graph",
                description: "Read the entire knowledge graph",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
                autoApprove: false,
            },
            {
                name: "search_nodes",
                description: "Search for nodes in the knowledge graph based on a query",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query to match against entity names, types, and observation content",
                        },
                    },
                    required: ["query"],
                },
                autoApprove: false,
            },
            {
                name: "open_nodes",
                description: "Open specific nodes in the knowledge graph by their names",
                inputSchema: {
                    type: "object",
                    properties: {
                        names: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                            description: "An array of entity names to retrieve",
                        },
                    },
                    required: ["names"],
                },
                autoApprove: false,
            },
        ],
    },
    postgres: {
        command: "npx",
        args: [
            "-y",
            "@modelcontextprotocol/server-postgres",
            "${text:postgresql://localhost/mydb}",
        ],
        config_schema: {
            DATABASE_URL: {
                title: "Database URL",
                description: "URL for the PostgreSQL database",
                type: "arg",
            },
        },
    },
    puppeteer: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-puppeteer"],
        env_from_main_process: ["DISPLAY"],
        mcp_server_tools: [
            {
                name: "puppeteer_navigate",
                description: "Navigate to a URL",
                inputSchema: {
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
                description: "Take a screenshot of the current page or a specific element",
                inputSchema: {
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
                inputSchema: {
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
                inputSchema: {
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
                inputSchema: {
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
                inputSchema: {
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
                inputSchema: {
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
        config_schema: {
            SENTRY_AUTH_TOKEN: {
                title: "Sentry Auth Token",
                description: "Auth token for Sentry",
                type: "arg",
            },
        },
        mcp_server_tools: [
            {
                name: "get_sentry_issue",
                description: "Retrieve and analyze a Sentry issue by ID or URL. Use this tool when you need to:\n                - Investigate production errors and crashes\n                - Access detailed stacktraces from Sentry\n                - Analyze error patterns and frequencies\n                - Get information about when issues first/last occurred\n                - Review error counts and status",
                inputSchema: {
                    type: "object",
                    properties: {
                        issue_id_or_url: {
                            type: "string",
                            description: "Sentry issue ID or URL to analyze",
                        },
                    },
                    required: ["issue_id_or_url"],
                },
                autoApprove: false,
            },
        ],
    },
    slack: {
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
        mcp_server_tools: [
            {
                name: "slack_list_channels",
                description: "List public channels in the workspace with pagination",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "number",
                            description: "Maximum number of channels to return (default 100, max 200)",
                            default: 100,
                        },
                        cursor: {
                            type: "string",
                            description: "Pagination cursor for next page of results",
                        },
                    },
                },
                autoApprove: false,
            },
            {
                name: "slack_post_message",
                description: "Post a new message to a Slack channel",
                inputSchema: {
                    type: "object",
                    properties: {
                        channel_id: {
                            type: "string",
                            description: "The ID of the channel to post to",
                        },
                        text: {
                            type: "string",
                            description: "The message text to post",
                        },
                    },
                    required: ["channel_id", "text"],
                },
                autoApprove: false,
            },
            {
                name: "slack_reply_to_thread",
                description: "Reply to a specific message thread in Slack",
                inputSchema: {
                    type: "object",
                    properties: {
                        channel_id: {
                            type: "string",
                            description: "The ID of the channel containing the thread",
                        },
                        thread_ts: {
                            type: "string",
                            description: "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.",
                        },
                        text: {
                            type: "string",
                            description: "The reply text",
                        },
                    },
                    required: ["channel_id", "thread_ts", "text"],
                },
                autoApprove: false,
            },
            {
                name: "slack_add_reaction",
                description: "Add a reaction emoji to a message",
                inputSchema: {
                    type: "object",
                    properties: {
                        channel_id: {
                            type: "string",
                            description: "The ID of the channel containing the message",
                        },
                        timestamp: {
                            type: "string",
                            description: "The timestamp of the message to react to",
                        },
                        reaction: {
                            type: "string",
                            description: "The name of the emoji reaction (without ::)",
                        },
                    },
                    required: ["channel_id", "timestamp", "reaction"],
                },
                autoApprove: false,
            },
            {
                name: "slack_get_channel_history",
                description: "Get recent messages from a channel",
                inputSchema: {
                    type: "object",
                    properties: {
                        channel_id: {
                            type: "string",
                            description: "The ID of the channel",
                        },
                        limit: {
                            type: "number",
                            description: "Number of messages to retrieve (default 10)",
                            default: 10,
                        },
                    },
                    required: ["channel_id"],
                },
                autoApprove: false,
            },
            {
                name: "slack_get_thread_replies",
                description: "Get all replies in a message thread",
                inputSchema: {
                    type: "object",
                    properties: {
                        channel_id: {
                            type: "string",
                            description: "The ID of the channel containing the thread",
                        },
                        thread_ts: {
                            type: "string",
                            description: "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.",
                        },
                    },
                    required: ["channel_id", "thread_ts"],
                },
                autoApprove: false,
            },
            {
                name: "slack_get_users",
                description: "Get a list of all users in the workspace with their basic profile information",
                inputSchema: {
                    type: "object",
                    properties: {
                        cursor: {
                            type: "string",
                            description: "Pagination cursor for next page of results",
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of users to return (default 100, max 200)",
                            default: 100,
                        },
                    },
                },
                autoApprove: false,
            },
            {
                name: "slack_get_user_profile",
                description: "Get detailed profile information for a specific user",
                inputSchema: {
                    type: "object",
                    properties: {
                        user_id: {
                            type: "string",
                            description: "The ID of the user",
                        },
                    },
                    required: ["user_id"],
                },
                autoApprove: false,
            },
        ],
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
};
const MCP_TOOL_NAME_SEPARATOR = "_-_";
export const getMCPFullToolName = ({ server_name, name, }) => {
    return `${server_name}${MCP_TOOL_NAME_SEPARATOR}${name}`;
};
export const getMCPToolNameParts = (fullName) => {
    const [serverName, toolName] = fullName.split(MCP_TOOL_NAME_SEPARATOR);
    if (serverName && toolName) {
        return { serverName, toolName };
    }
};
