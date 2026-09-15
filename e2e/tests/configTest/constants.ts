export const CONFIG_TEST = {
  applicationDatabaseName: "cli_e2e_config_db",
  applicationStateDatabaseName: "db",
  configFunctionName: "getDeploymentStatus",
  configFunctionResult: "config deployment function",
  deniedFunctionName: "getPrivateDeploymentStatus",
  deniedTableName: "not_published_from_config",
  port: 3005,
  schemaName: "cli_e2e_config",
  tableName: "started_from_config",
  workspaceName: "Workspace from config",
  workspaceWindowName: "Configured query",
} as const;
