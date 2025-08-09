import { test } from "node:test";
import {
  createContainer,
  type CreateContainerParams,
} from "./createContainer.js";

void test("DockerSandbox", async () => {
  const config = {
    files: [
      {
        content:
          '{\n  "name": "fetch-app",\n  "version": "1.0.0",\n  "description": "Basic Node.js app that fetches from host port 3004",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js"\n  },\n  "dependencies": {\n    "axios": "^1.6.0"\n  }\n}',
        name: "package.json",
      },
      {
        content:
          "const axios = require('axios');\n\nconst HOST_URL = 'http://host.docker.internal:3004';\n\nasync function fetchFromHost() {\n  try {\n    console.log(`Attempting to fetch from ${HOST_URL}`);\n    const response = await axios.get(HOST_URL, {\n      timeout: 10000 // 10 second timeout\n    });\n    console.log('Response status:', response.status);\n    console.log('Response data:', response.data);\n  } catch (error) {\n    if (error.code === 'ECONNREFUSED') {\n      console.log('Connection refused - make sure service is running on host port 3004');\n    } else if (error.code === 'ETIMEDOUT') {\n      console.log('Request timed out');\n    } else {\n      console.log('Error fetching from host:', error.message);\n    }\n  }\n}\n\n// Fetch immediately\nfetchFromHost();\n\n// Then fetch every 30 seconds\nsetInterval(fetchFromHost, 30000);\n\nconsole.log('Fetch app started. Will attempt to fetch from host:3004 every 30 seconds...');",
        name: "index.js",
      },
      {
        name: "Dockerfile",
        content:
          'FROM node:18-alpine\nWORKDIR /workspace\nCOPY . .\nRUN npm install  \nCMD ["node", "index.js"]',
      },
    ],
    networkMode: "bridge",
  } satisfies CreateContainerParams;
  const sandbox = await createContainer(config);
  console.log("Sandbox logs:", sandbox.stdout.toString());
  console.log("Sandbox logs:", sandbox.stderr.toString());
});
