import { strict } from "assert";
import { test } from "node:test";
import { createContainer } from "./createContainer.js";
import type { CreateContainerParams } from "./fetchTools.js";

const testContainerName = `test-container-${Date.now()}`;
void test("createContainer build error", async () => {
  const config = {
    files: {
      ...filesObject,
      Dockerfile: Dockerfile.replace(
        "WORKDIR",
        "WORKDIR_INVALID", // Introduce an error
      ),
    },
    networkMode: "bridge",
  } satisfies CreateContainerParams;
  const sandbox = await createContainer(testContainerName, config);
  strict.equal(sandbox.state, "build-error");
  const stderr = sandbox.log
    .filter((l) => l.type === "stderr")
    .map((l) => l.text)
    .join("");
  strict.equal(stderr.includes("| >>> WORKDIR_INVALID"), true);
});

void test("createContainer run error", async () => {
  const config = {
    files: {
      ...filesObject,
      "index.js": indexJsContent.replace(
        `require`,
        `requireInvalid`, // Introduce an error
      ),
    },
    networkMode: "bridge",
  } satisfies CreateContainerParams;
  const sandbox = await createContainer(testContainerName, config);
  strict.equal(sandbox.state, "error");
  const stderr = sandbox.log
    .filter((l) => l.type === "stderr")
    .map((l) => l.text)
    .join("");
  strict.equal(stderr.includes("requireInvalid is not defined"), true);
});

void test("createContainer run timeout", async () => {
  const config = {
    files: {
      ...filesObject,
      "index.js": indexJsContent.replace(
        `try { `,
        `try { \nawait new Promise(resolve => setTimeout(resolve, 120_000));\n `,
      ),
    },
    timeout: 3_000,
  } satisfies CreateContainerParams;
  const sandbox = await createContainer(testContainerName, config);
  strict.equal(sandbox.state, "timed-out");
  const stdout = sandbox.log
    .filter((l) => l.type === "stdout")
    .map((l) => l.text)
    .join("");
  strict.equal(
    stdout.includes("Fetch app started. Will attempt to fetch from"),
    true,
  );
  strict.equal(stdout.includes("Will attempt to fetch from"), true);
});

void test("createContainer stdout response", async () => {
  const expectedOutput = "Hello from index.js";
  const config = {
    files: {
      ...filesObject,
      "index.js": `console.log('${expectedOutput}');`,
    },
    timeout: 3_000,
  } satisfies CreateContainerParams;
  const sandbox = await createContainer(testContainerName, config);
  strict.equal(sandbox.state, "finished");
  const stdout = sandbox.log
    .filter((l) => l.type === "stdout")
    .map((l) => l.text)
    .join("");
  const stderr = sandbox.log
    .filter((l) => l.type === "stderr")
    .map((l) => l.text)
    .join("");
  strict.equal(stdout, expectedOutput + "\n");
  strict.equal(stderr, "");
});

// void test("createContainer host network", async () => {
//   const { address, route, server } = await dockerMCPRouter(() => {
//     return {
//       connection_id: "1",
//       db_data_permissions: { Mode: "Run commited SQL" },
//       db_schema_permissions: { type: "Full" },
//     };
//   });
//   const config = {
//     files: {
//       ...filesObject,
//       "index.js": indexJsContent.replace(
//         `http://127.0.0.1:3004/robots.txt`,
//         `http://${address.address}:${address.port}${route}`, // Use the MCP router address
//       ),
//     },
//     timeout: 4_000,
//     networkMode: "host",
//   } satisfies CreateContainerParams;
//   const sandbox = await createContainer(testContainerName, config);
//   strict.equal(sandbox.state, "finished");
//   strict.equal(sandbox.stdout.includes("<title>Prostgles UI</title>"), true);
//   strict.equal(sandbox.stderr, "");
//   server.close();
// });

void test("createContainer stderr response", async () => {
  const expectedOutput = "Hello from index.js";
  const config = {
    files: {
      ...filesObject,
      "index.js": `console.error('${expectedOutput}');`,
    },
    timeout: 3_000,
  } satisfies CreateContainerParams;
  const sandbox = await createContainer(testContainerName, config);
  strict.equal(sandbox.state, "finished");
  const stdout = sandbox.log
    .filter((l) => l.type === "stdout")
    .map((l) => l.text)
    .join("");
  const stderr = sandbox.log
    .filter((l) => l.type === "stderr")
    .map((l) => l.text)
    .join("");
  strict.equal(stdout, "");
  strict.equal(stderr, expectedOutput + "\n");
});

const packageJson = {
  name: "fetch-app",
  version: "1.0.0",
  description: "Basic Node.js app that fetches from host port 3004",
  main: "index.js",
  scripts: { start: "node index.js" },
  dependencies: { axios: "^1.6.0" },
};

const indexJsContent = `
const axios = require('axios');
const HOST_URL = 'http://127.0.0.1:3004/robots.txt'; // This resource will not redirect
async function fetchFromHost() {  
  try { 
    console.log(\`Attempting to fetch from \${HOST_URL}\`);
    const response = await axios.post(HOST_URL, {
      timeout: 3_000  
    });    
    console.log('Response status:', response.status); console.log('Response data:', response.data);  
  } catch (error) {    
    if (error.code === 'ECONNREFUSED') {
      console.log('Connection refused - make sure service is running on host port 3004');    
    } else if (error.code === 'ETIMEDOUT') {
      console.log('Request timed out');
    } else {
      console.log('Error fetching from host:', error.message);
    }
  }
}
fetchFromHost();
//setInterval(fetchFromHost, 30000);
console.log('Fetch app started. Will attempt to fetch from host:3004 every 30 seconds...');
`;

const Dockerfile = `
FROM node:18-alpine

WORKDIR /workspace

COPY package*.json ./

RUN npm install  

COPY . .

CMD ["node", "index.js"]
`;

const filesObject = {
  "package.json": JSON.stringify(packageJson, null, 2),
  "index.js": indexJsContent,
  Dockerfile: Dockerfile,
};
