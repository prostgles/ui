import type { DBS } from "@src/index";
import { readFileSync } from "fs";
import { join } from "path";
import type { ChatDatabasePermissions } from "../DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import { runContainerWithProxyAccess } from "../DockerSandbox/runContainerWithProxyAccess";
import type {
  AgenticWorkflowDefinition,
  ProxyCallData,
} from "./defineAgenticWorkflow";

const defineAgenticWorkflowTs = readFileSync(
  join(__dirname.replace("server/dist/", ""), "defineAgenticWorkflow.ts"),
  "utf8",
);

export const createAgenticWorkflowContainer = async (
  dbs: DBS,
  {
    workflowTs,
    user_id,
    chat,
  }: {
    workflowTs: string;
    user_id: string;
    chat: ChatDatabasePermissions;
  },
  mode:
    | {
        type: "definitions-only";
        handler: (
          args: Extract<ProxyCallData, { type: "definitions" }>,
          ctx: {
            chat: ChatDatabasePermissions;
            sid_token: string;
          },
        ) => void;
      }
    | {
        type: "full";
        definition: AgenticWorkflowDefinition;
        handler: (
          args: Exclude<ProxyCallData, { type: "definitions" }>,
          ctx: {
            chat: ChatDatabasePermissions;
            sid_token: string;
          },
        ) => Promise<unknown>;
      },
) => {
  return runContainerWithProxyAccess(
    dbs,
    {
      user_id,
      chat,
      requestHandlers: {
        "/agent": {
          method: "POST",
          handler: (ctx, req, res) => {
            const data = req.body as ProxyCallData;

            if (mode.type === "full") {
              if (data.type === "definitions") {
                return res.status(400).json({
                  error: "Definitions calls are not allowed in full mode",
                });
              }
              mode
                .handler(data, ctx)
                .then((result) => {
                  res.json(result);
                })
                .catch((error) => {
                  console.error("Error in handler:", error);
                  res.status(500).json({ error: "Internal server error" });
                });
              return;
            }

            if (data.type !== "definitions") {
              res.status(400).json({
                error: "Only definitions calls are allowed in this container",
              });
            } else {
              // resolve({ success: true, data: data.definitions });
              mode.handler(data, ctx);
            }
          },
        },
      },
    },
    {
      networkMode: "bridge",
      files: {
        Dockerfile: `
          FROM node:18
          WORKDIR /app
          COPY . .
          RUN npm install
          RUN npm run build
          CMD ["npm", "start"]
        `,
        "defineAgenticWorkflow.ts": defineAgenticWorkflowTs,
        "index.ts": workflowTs,
        "package.json": `
          {
            "name": "agentic-workflow",
            "version": "1.0.0",
            "main": "index.js",
            "scripts": {
              "build": "tsc",
              "start": "node index.js"
            },
            "dependencies": {
              "@types/node": "^22.15.2",
              "typescript": "^5.8.3"
            }
          }
         `,
        "tsconfig.json": `
          {
            "compilerOptions": {
              "target": "ES2020",
              "module": "CommonJS",
              "strict": true,
              "esModuleInterop": true,
              "skipLibCheck": true,
              "forceConsistentCasingInFileNames": true
            }
          }
         `,
      },
      environment: {
        MODE: mode.type,
      },
    },
  );
};
