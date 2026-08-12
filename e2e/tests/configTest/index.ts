import {
  defineConfig,
  type LayoutConfig,
  type WorkspaceInsertModel,
} from "@prostgles/prostgles";
import { CONFIG_TEST } from "./constants";
import { functions } from "./functions";

const publishedTableName = `${CONFIG_TEST.schemaName}.${CONFIG_TEST.tableName}`;
const workspaceWindowId = "8ce5d5fd-9387-4816-bd2a-5b1b22cc71df";
const workspaceLayout: LayoutConfig = {
  id: "root",
  type: "tab",
  size: 1,
  activeTabKey: workspaceWindowId,
  items: [
    {
      id: workspaceWindowId,
      type: "item",
      tableName: null,
      viewType: "sql",
      size: 1,
    },
  ],
};

const workspaces: WorkspaceInsertModel[] = [
  {
    name: CONFIG_TEST.workspaceName,
    layout: workspaceLayout,
    windows: [
      {
        id: workspaceWindowId,
        type: "sql",
        name: CONFIG_TEST.workspaceWindowName,
        sql: `SELECT * FROM ${publishedTableName}`,
      },
    ],
  },
];

export default defineConfig()({
  id: CONFIG_TEST.applicationDatabaseName,
  createDatabase: true,
  connection: {
    name: CONFIG_TEST.applicationDatabaseName,
    type: "Standard",
    db_host:
      process.env.PROSTGLES_DATABASE_HOST ??
      process.env.POSTGRES_HOST ??
      "localhost",
    db_port: Number(
      process.env.PROSTGLES_DATABASE_PORT ?? process.env.POSTGRES_PORT ?? 5432,
    ),
    db_name: process.env.PROSTGLES_DATABASE_NAME,
    db_user: process.env.PROSTGLES_DATABASE_USER ?? process.env.POSTGRES_USER,
    db_pass:
      process.env.PROSTGLES_DATABASE_PASSWORD ?? process.env.POSTGRES_PASSWORD,
    db_ssl: "disable",
  },
  schemaFilter: { [CONFIG_TEST.schemaName]: 1 },
  publish: ({ user }) =>
    user?.type === "admin" ?
      {
        [publishedTableName]: { select: "*" },
      }
    : null,
  functions,
  workspaces,
  onInitSQL: `
    CREATE SCHEMA IF NOT EXISTS "${CONFIG_TEST.schemaName}";
    CREATE TABLE IF NOT EXISTS "${CONFIG_TEST.schemaName}"."${CONFIG_TEST.tableName}" (
      id integer primary key,
      name text not null
    );
    INSERT INTO "${CONFIG_TEST.schemaName}"."${CONFIG_TEST.tableName}" (id, name)
    VALUES (1, 'started from config')
    ON CONFLICT (id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS "${CONFIG_TEST.schemaName}"."${CONFIG_TEST.deniedTableName}" (
      id integer primary key,
      name text not null
    );
  `,
});
