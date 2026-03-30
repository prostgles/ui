import { dedent } from "svgScreenshots/utils/dedent";
import { stringify, type ToolUse } from "./utils";
import type { DBSSchema } from "common/publishUtils";

export const mcpSandboxToolUse: ToolUse = {
  content: `I'll create a container that runs a simple Node.js application.`,
  tool: [
    {
      id: "mcp-tool-use-sandbox1",
      type: "function",
      function: {
        name: "prostgles-ui--run_code_in_sandbox",
        arguments: stringify({
          files: {
            Dockerfile: `FROM node:24 \nWORKDIR /app \nCOPY . . \nRUN npm install \nCMD ["npm", "start"]`,
            "package.json": JSON.stringify({
              name: "test-app",
              version: "1.0.0",
              scripts: {
                start: "node index.js",
              },
              depenencies: {
                "node-fetch": "^3.3.0",
              },
            }),
            "index.js": dedent(`
              console.log(process.env.USER_INPUT_VALUE);
              fetch(
                process.env.DOCKER_MCP_ENDPOINT + "/db/execute_readonly_sql", 
                { headers: { "Content-Type": "application/json" }, 
                method: "POST", 
                body: JSON.stringify({ sql: "CREATE TABLE mynewtable(id int);" }) 
              }).then(res => res.json().then(json => {
                if(res.ok){
                  console.log("Table created successfully", json);
                } else {
                  console.error(json.message);
                }
              })) 
              fetch(
                process.env.DOCKER_MCP_ENDPOINT + "/db/execute_readonly_sql", 
                { headers: { "Content-Type": "application/json" }, 
                method: "POST", 
                body: JSON.stringify({ sql: "SELECT * FROM users" }) 
              }).then(res => res.json()).then(console.log).catch(console.error);
            `),
          },
          networkMode: "bridge",
          timeout: 30_000,
          userInput: {
            key1: {
              title: "Table filter",
              type: "table-column-value",
              optional: true,
              tableName: "users",
              columnName: "username",
            },
          },
        } satisfies Partial<DBSSchema["docker_containers"]["configuration"]>),
      },
    },
  ],
};
