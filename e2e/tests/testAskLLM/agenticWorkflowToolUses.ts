import type { DBSSchema } from "common/publishUtils";
import { stringify, type ToolUse } from "./utils";
type UserInput = NonNullable<
  DBSSchema["agentic_workflows"]["definition_data"]["userInput"]
>;

const clashingTableDefinition = `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT,
    type TEXT
  );
`;

export const research = "research" as const;
type Mode =
  | "input"
  | "clashing"
  | "noinput"
  | "invalidTable"
  | "invalidPermissionTable";
const getFunc = (mode: Mode) => `
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
        fetch: {
          fetch: 1,
        },
      },
      agentDefinitions: {
        researcher: {
          prompt: "You are a research assistant. ",
          modelName: "anthropic/claude-sonnet-4",
          tools: {
            fetch: { fetch: 1 },
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
          } satisfies Record<UserInput[string]["type"], UserInput[string]>)
        ),
    } satisfies Partial<DBSSchema["agentic_workflows"]["definition_data"]> & {
      name: string;
    },
    null,
    2,
  )},
  async ({ researcher }, { db, runSQL }, toolHandler, userInputValue, setProgress) => {
    setProgress(0, "Starting workflow");
    await db.users.insert({ username: "Prostgles", type: "from-agent" });
/* need to allow db access for this
    await db.new_users
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
    toolHandler.fetch.fetch({ url: "https://www.prostgles.com" }).then(console.log).catch(console.log);
    const filterCount = ${mode !== "input" ? "undefined;//" : ""} await db.users.count(userInputValue["table-filter"]);
    console.log("Filter count:", filterCount);
    setProgress(1, "Finished database operation, starting research");
    ${mode === "invalidTable" ? "await db.invalid_table.count();" : ""}
    db.users.find().then((users) => {
      users.forEach(async (user, index) => {
        setProgress((100/users.length) * index, "Processing user " + (index + 1) + "/" + users.length);
        const result = await researcher(" ${research} Prostgles"); 
        const sinceStart = Date.now() - start;
        await db.users.update({ id: user.id }, { username: user.username + " "  + sinceStart + " " + result.summary });
      })
    })
  },
);
`;

export const agenticWorkflowToolUses = Object.fromEntries(
  (
    [
      "input",
      "clashing",
      "noinput",
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
                name: "prostgles-ui--create_agentic_workflow",
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
