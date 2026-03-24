export const getAgenticWorkflowDockerCoreFiles = (
  package_dependencies: Record<string, string> | undefined,
  forDefinitions = false,
) => {
  const packageJson = getPackageJsonForAgenticWorkflow({ forDefinitions });
  if (package_dependencies) {
    for (const pkgName of Object.keys(package_dependencies)) {
      if (pkgName in packageJson.dependencies) {
        throw new Error(
          `Package name conflict: ${pkgName} is a reserved package name and cannot be used as a custom package dependency. ` +
            `Please choose a different package or remove it from the dependencies list.`,
        );
      }
      (packageJson.dependencies as Record<string, string>)[pkgName] =
        package_dependencies[pkgName]!;
    }
  }

  const tsconfigJson = JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "CommonJS",
      /** Allow top level await */
      // module: "NodeNext",
      // moduleResolution: "NodeNext",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      importHelpers: true,
      noEmitHelpers: true,
    },
  });

  return {
    Dockerfile: DockerfileForAgenticWorkflow,
    "package.json": JSON.stringify(packageJson, null, 2),
    "tsconfig.json": tsconfigJson,
  };
};

/**
 * DNS/network issues can leave the container building until timeout without descriptive logs unless npm i --verbose is used
 */
const DETECT_DNS_ISSUES_AND_THEN_NPM_INSTALL = `
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

RUN npm install --silent

`;

export const DockerfileForAgenticWorkflow = `
FROM node:22-slim
WORKDIR /app

COPY package*.json ./

${DETECT_DNS_ISSUES_AND_THEN_NPM_INSTALL}

COPY . . 

RUN npm run build
CMD ["npm", "start", "--silent"]
`;

const getPackageJsonForAgenticWorkflow = ({
  forDefinitions,
}: {
  forDefinitions: boolean;
}) => ({
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
    tslib: "^2.8.1",
    "prostgles-types": "^4.0.208",
    ...(forDefinitions ? { "pgsql-ast-parser": "^12.0.2" } : {}),
  },
});
