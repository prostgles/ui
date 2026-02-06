import { readFileSync } from "fs";
import { join } from "path";
import { createContainer } from "../DockerSandbox/createContainer";
import { dockerContainerAuthRegistry } from "../DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";

const defineAgenticWorkflowTs = readFileSync(
  join(__dirname.replace("server/dist/", ""), "defineAgenticWorkflow.ts"),
  "utf8",
);

export const createAgenticWorkflowContainer = async (workflowTs: string) => {
  dockerContainerAuthRegistry.setContainerInfo(name, {
    chat,
    sid_token,
  });
  const result = await createContainer("test-container", {
    networkMode: "host",
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
            "name": "test-container",
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
      DOCKER_MCP_ENDPOINT: proxy.base_url + "/agent",
      MODE: "definitions-only",
    },
  });

  return result;
};
