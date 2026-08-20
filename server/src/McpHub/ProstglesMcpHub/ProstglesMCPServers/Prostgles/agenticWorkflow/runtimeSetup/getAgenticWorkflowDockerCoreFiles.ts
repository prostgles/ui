import serverPackageJson from "../../../../../../../package.json";

export const getAgenticWorkflowDockerCoreFiles = (
  package_dependencies: Record<string, string> | undefined,
) => {
  const packageJson = structuredClone(packageJsonTemplate);
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
    "eslint.config.mjs": eslintConfigMjs,
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
FROM node:24-slim
WORKDIR /app

COPY package*.json ./

${DETECT_DNS_ISSUES_AND_THEN_NPM_INSTALL}

COPY . . 

RUN npm run build
CMD ["npm", "start", "--silent"]
`;

import { getProperty } from "prostgles-types";

type PackageJsonTemplate = Record<
  "dependencies" | "devDependencies",
  Record<string, string>
>;

const fromServerPackageJson = <T extends PackageJsonTemplate>(
  templatePkg: T,
): T => {
  const result = {
    ...templatePkg,
  };
  for (const depProp of ["dependencies", "devDependencies"] as const) {
    for (const [packageName, version] of Object.entries(templatePkg[depProp])) {
      const resolvedVersion = getProperty(
        (serverPackageJson as PackageJsonTemplate)[depProp],
        packageName,
      );
      result[depProp][packageName] = resolvedVersion || version;
    }
  }
  return result;
};

export const packageJsonTemplate = fromServerPackageJson({
  name: "agentic-workflow",
  version: "1.0.0",
  main: "index.js",
  scripts: {
    lint: "eslint index.ts --quiet --fix",
    build: "tsc && npm run lint",
    start: "node index.js",
  },
  dependencies: {
    typescript: "^5.9.3",
    tslib: "^2.8.1",
    "prostgles-types": "^4.0.279",
  },
  devDependencies: {
    "@types/node": "^22.20.0",
    eslint: "^9.39.4",
    "@eslint/js": "^9.39.1",
    "typescript-eslint": "^8.62.0",
  },
} as const);

const eslintConfigMjs = `
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    ignores: [
      "node_modules",
      "dist",
      "**/*.d.ts",
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.js", "**/*.ts"],
    rules: {
      "no-cond-assign": "error",
      // Reduce noise and cost. Maybe make this configurable?
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-async-promise-executor": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "no-useless-escape": "off",
      "no-unused-vars": "off",
      "global-require": "error",          // disallow require() except at top-level
      "@typescript-eslint/no-var-requires": "error", // disallow var require()
      "@typescript-eslint/no-require-imports": "error",
      //"import/first": "error",            // enforce all imports at top-level
      "no-empty": "off",
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/await-thenable": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/restrict-template-expressions": [
        "warn",
        { allowNumber: true, allowArray: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
);

`;
