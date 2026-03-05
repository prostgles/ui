import type { DBS } from "@src/index";
import { getAgenticWorkflowFiles } from "./getAgenticWorkflowFiles";

export const getOrchestrationContainerFiles = async ({
  dbs,
  workflowTs,
  forDefinitions,
}: {
  dbs: DBS;
  workflowTs: string;
  forDefinitions: boolean;
}) => {
  return {
    Dockerfile,
    ...(await getAgenticWorkflowFiles(dbs, "runtime")),
    "index.ts": workflowTs,
    "package.json": getPackageJson(forDefinitions),
    "tsconfig.json": tsconfigJson,
  };
};

const DETECT_DNS_ISSUES = `
# Fail-fast npm behavior
ENV NODE_OPTIONS=--dns-result-order=ipv4first \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_FETCH_RETRIES=0 \
    NPM_CONFIG_FETCH_TIMEOUT=10000 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=1000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=2000

# Build-time preflight: DNS + HTTPS to npm registry (hard fail quickly)
RUN node - <<'EOF'
const dns = require('dns').promises;
const https = require('https');

function withTimeout(ms, p, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timeout')), ms))
  ]);
}

(async () => {
  try {
    await withTimeout(3000, dns.lookup('registry.npmjs.org'), 'DNS lookup');
    await withTimeout(5000, new Promise((res, rej) => {
      const req = https.get('https://registry.npmjs.org/-/ping', (r) => {
        r.resume();
        (r.statusCode === 200) ? res() : rej(new Error('HTTP status ' + r.statusCode));
      });
      req.on('error', rej);
    }), 'HTTPS ping');
    console.log('Network preflight OK');
  } catch (e) {
    console.error('NETWORK_PREFLIGHT_FAIL. Build DNS server might not bet working as expected. Use --network host', e.message);
    process.exit(42);
  }
})();
EOF
`;

const Dockerfile = `
FROM node:22-slim
WORKDIR /app
COPY . . 

${DETECT_DNS_ISSUES}

RUN npm install --silent
RUN npm run build
CMD ["npm", "start", "--silent"]
`;

const getPackageJson = (forDefinitions: boolean) =>
  JSON.stringify({
    name: "agentic-workflow",
    version: "1.0.0",
    main: "index.js",
    scripts: {
      build: "tsc",
      start: "node index.js",
    },
    dependencies: {
      "@types/node": "^22.15.2",
      typescript: "^5.8.3",
      "prostgles-types": "^4.0.208",
      ...(forDefinitions ? { "pgsql-ast-parser": "^12.0.2" } : {}),
    },
  });

const tsconfigJson = JSON.stringify({
  compilerOptions: {
    target: "ES2020",
    module: "CommonJS",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
  },
});
