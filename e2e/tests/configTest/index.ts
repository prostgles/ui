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

const prostgles = defineConfig();

export default prostgles({
  id: CONFIG_TEST.applicationDatabaseName,
  connection: {
    db_schema_filter: { [CONFIG_TEST.schemaName]: 1 },
  },
  access_control: {
    type: "Custom",
    customTables: [
      {
        tableName: publishedTableName,
        select: true,
      },
    ],
  },
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
