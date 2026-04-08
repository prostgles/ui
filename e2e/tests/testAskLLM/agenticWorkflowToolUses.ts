import type { DBSSchema } from "common/publishUtils";
import { stringify, type ToolUse } from "./utils";
import type { ExtractBy } from "common/utils";
import { getProstglesMCPFullToolName } from "common/mcpUtils";
type UserInput = NonNullable<
  DBSSchema["agentic_workflows"]["definition_data"]["userInput"]
>;
type InputUnion = UserInput[keyof UserInput];

const clashingTableDefinition = `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT,
    type TEXT
  );
`;

const fileInputDefs = {
  "folder-path": {
    title: "Folder path",
    type: "folder-path",
    accessMode: "read",
  },
  "file-path": {
    title: "File path",
    type: "file-path",
    accessMode: "read",
  },
  "file-or-folder-path": {
    title: "File or folder path",
    type: "file-or-folder-path",
    accessMode: "read",
  },
  "folder-paths": {
    title: "Folder paths",
    type: "folder-paths",
    accessMode: "read",
  },
  "file-paths": {
    title: "File paths",
    type: "file-paths",
    accessMode: "read",
  },
  "file-or-folder-paths": {
    title: "File or folder paths",
    type: "file-or-folder-paths",
    accessMode: "read",
  },
} as const;

export const research = "research" as const;
type Mode =
  | "input"
  | "clashing"
  | "noinput"
  | "filesystem"
  | "invalidTable"
  | "invalidPermissionTable";
const getFunc = (mode: Mode) => `
import { readdirSync, rmSync, } from "fs";
import { readFile } from "fs/promises";
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
export default defineAgenticWorkflow(
  ${JSON.stringify(
    {
      name: "Test Workflow",
      containerConfiguration: { timeout: 60_000 },
      databaseAccessDefinitions: {
        mode: "custom",
        tablePermissions: {
          users: { select: true, insert: true, update: true },
          new_users: {
            select: true,
            insert: true,
            update: {
              fields: { password: 1 },
              forcedFilter: {
                $and: [{ fieldName: "type", value: "from-agent" }],
              },
            },
          },
          ...(mode === "invalidPermissionTable" ?
            { invalid_table: { select: true } }
          : {}),
        },
        ddlStatements: `
          ${mode === "clashing" ? clashingTableDefinition : ""}
          CREATE TABLE IF NOT EXISTS new_users (
            id SERIAL PRIMARY KEY,
            username TEXT,
            password TEXT,
            type TEXT
          );
        `,
      },
      orchestrationTools: {
        web: {
          fetch: 1,
        },
        ...(mode === "filesystem" && {
          filesystem: {
            list_allowed_directories: 1,
            read_text_file: 1,
          },
        }),
      },
      agentDefinitions: {
        researcher: {
          prompt: "You are a research assistant. ",
          modelName: "anthropic/claude-sonnet-4",
          tools: {
            web: { fetch: 1 },
          },
          outputSchema: {
            summary: { type: "string" },
            references: {
              arrayOfType: {
                url: { type: "string" },
                title: { type: "string" },
              },
            },
          },
        },
      },
      userInput:
        mode !== "input" ? undefined : (
          ({
            "table-filter": {
              title: "Users filter",
              type: "table-filter",
              tableName: "users",
            },
            custom: {
              title: "Sort column",
              type: "custom",
              dataType: "string",
            },
            "table-name": {
              title: "Table name",
              type: "table-name",
            },
            "table-column": {
              title: "Table column",
              type: "table-column",
              tableName: "users",
            },
            "table-and-column": {
              title: "Table and column",
              type: "table-and-column",
            },
            "table-column-value": {
              title: "Table column value",
              type: "table-column-value",
              tableName: "users",
              columnName: "type",
            },
            "table-column-values": {
              title: "Table column values",
              type: "table-column-values",
              tableName: "users",
              columnName: "type",
            },
            enum: {
              title: "Enum value",
              type: "enum",
              values: ["value1", "value2", "value3"],
            },
            ...fileInputDefs,
          } satisfies {
            [K in InputUnion["type"]]: ExtractBy<InputUnion, "type", K>;
          })
        ),
    } satisfies Partial<DBSSchema["agentic_workflows"]["definition_data"]> & {
      name: string;
    },
    null,
    2,
  )},
  async ({ agentHandlers: { researcher }, orchestratorToolHandlers, tableHandlers, runSQL ,  userInputValues, setProgress }) => {
    setProgress(0, "Starting workflow");
    await tableHandlers.users.insert({ username: "Prostgles", type: "from-agent" });
/* need to allow db access for this
    await tableHandlers.new_users
      .insert(
        {
          username: "New User",
          password: "securepassword",
          type: "from-agent",
        },
        { returning: "*" },
      )
      .then((newUser) => {
        console.log("Inserted new user:", newUser);
      });
      runSQL("SELECT * FROM new_users").then((res) => console.log("Users:", res));
    */
    const start = Date.now();
    orchestratorToolHandlers.web.fetch({ url: "https://www.prostgles.com", max_length: 600 }).then(console.log).catch(console.log);
    const filterCount = ${mode !== "input" ? "undefined;//" : ""} await tableHandlers.users.count(userInputValues["table-filter"]);
    console.log("Filter count:", filterCount);
    setProgress(1, "Finished database operation, starting research");
    ${mode === "invalidTable" ? "await tableHandlers.invalid_table.count();" : ""}
    const users = await tableHandlers.users.find();
    for (const [index, user] of users.entries()) {
      setProgress((100/users.length) * index, "Processing user " + (index + 1) + "/" + users.length);
      const result = await researcher(" ${research} Prostgles"); 
      const sinceStart = Date.now() - start;
      await tableHandlers.users.update({ id: user.id }, { username: user.username + " "  + sinceStart + " " + result.summary });
    } 
    ${
      mode === "filesystem" ? filesystemFunc
      : mode === "input" ? volumesFunc
      : ""
    }
  },
);
`;

const volumesFunc = `
  console.log(readdirSync(userInputValues["folder-path"]!)); 
  const filePath = userInputValues["file-path"]!;
  try {
    rmSync(filePath, { force: false });
  } catch (err) {
    if (err instanceof Error) {
      // Will surface EROFS, EACCES, ENOENT etc.
      console.error("Failed to remove package.json: ", err.message);
    } 
  }
  readFile(filePath).then((content) => {
    console.log("File content:", content.toString().slice(0, content.toString().indexOf("react-markdown")));
  }).catch(console.error);
`;

const filesystemFunc = `
await orchestratorToolHandlers.filesystem.list_allowed_directories({}).then(({ content  }) => {
  const [_,allowedDir] = content.split(\"\\n\")
  orchestratorToolHandlers.filesystem.read_text_file({
    path: allowedDir + "/tsconfig.base.json"
  }).then(({ content }) => console.log(content.slice(0, content.indexOf("resolveJsonModule"))));
});
`;

export const agenticWorkflowToolUses = Object.fromEntries(
  (
    [
      "input",
      "clashing",
      "noinput",
      "filesystem",
      "invalidTable",
      "invalidPermissionTable",
    ] as const
  ).map(
    (mode) =>
      [
        mode,
        {
          content:
            "Based on your requirements, I suggest the following agentic workflow.",
          tool: [
            {
              id: `agentic-workflow-tool-use-${mode}`,
              type: "function",
              function: {
                name: getProstglesMCPFullToolName(
                  "prostgles-ui",
                  "create_agentic_workflow",
                ),
                arguments: stringify({
                  workflow_function_definition_summary: `Agentic workflow definition for mode ${mode}`,
                  workflow_function_definition: getFunc(mode),
                }),
              },
            },
          ],
        } satisfies ToolUse,
      ] as const,
  ),
) as Record<Mode, ToolUse>;
