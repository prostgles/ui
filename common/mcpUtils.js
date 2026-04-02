const MCP_TOOL_NAME_SEPARATOR = "--";
export const getMCPFullToolName = (server_name, name) => {
    return `${server_name}${MCP_TOOL_NAME_SEPARATOR}${name}`;
};
export const getProstglesMCPFullToolName = (server_name, name) => getMCPFullToolName(server_name, name);
export const getMCPToolNameParts = (fullName) => {
    const [serverName, toolName] = fullName.split(MCP_TOOL_NAME_SEPARATOR);
    if (serverName && toolName) {
        return { serverName, toolName };
    }
};
export const DEFAULT_MCP_SERVER_NAMES = [
    "filesystem",
    "fetch",
    "git",
    "github",
    "google-maps",
    "memory",
    "playwright",
    "websearch",
    "webdev",
    "slack",
];
