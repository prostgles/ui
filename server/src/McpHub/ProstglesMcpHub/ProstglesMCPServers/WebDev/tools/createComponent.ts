import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fromEntries, getEntries } from "@common/utils";
import type {
  JSONBTypeIfDefined,
  McpCallContext,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { buildWebApp } from "@src/serverFunctions/adminServerFunctions/webApp/buildWebApp";
import { testWebApp } from "@src/serverFunctions/adminServerFunctions/webApp/testWebApp";
import { writeWebAppFiles } from "@src/serverFunctions/adminServerFunctions/webApp/writeWebAppFiles";
import { basename, join } from "path";
import { getWebDevChatAndConnection } from "./getWebDevChatAndConnection";
import { installDependenciesIfNeeded } from "./utils";

export const createComponent = async (
  {
    entryPoint: entryPointRaw,
    dependencies,
    devDependencies,
    files: filesWithAliases,
    test,
  }: JSONBTypeIfDefined<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["webdev"]["create_component"]["schema"]
  >,
  { chat, connection_id, dbs }: McpCallContext,
) => {
  const { web_app_directory } = await getWebDevChatAndConnection(dbs, {
    chat,
    connection_id,
  });
  const entryPoint = renameAliasedPath(entryPointRaw);
  const componentFile = basename(entryPoint);
  const componentName = componentFile.split(".")[0];
  if (!entryPointRaw.includes(`@/components/${componentName}`)) {
    throw "Entry point must be inside @/components/[componentName]/";
  }
  const files = fromEntries(
    getEntries(filesWithAliases).map(([filePathRaw, file]) => {
      const filePath = renameAliasedPath(filePathRaw);
      return [filePath, file];
    }),
  );
  const clientFiles = fromEntries(
    getEntries(files).map(([filePath, file]) => {
      return [join("client", filePath), file];
    }),
  );

  const testFile = {
    [join("e2e", "tests", `${componentName}.spec.ts`)]: test,
  };

  await installDependenciesIfNeeded({
    dependencies,
    devDependencies,
    web_app_directory,
  });

  await writeWebAppFiles(
    {
      connectionId: connection_id,
      files: {
        ...clientFiles,
        ...testFile,
      },
    },
    {
      dbo: dbs,
    },
  );

  const buildResult = await buildWebApp(
    { connectionId: connection_id },
    { dbo: dbs },
  );

  if (buildResult.state !== "close") {
    return Promise.reject(buildResult);
  }

  const testResult = await testWebApp(
    { connectionId: connection_id },
    {
      dbo: dbs,
    },
  );
  return { testResult };
};

const renameAliasedPath = (path: string) => {
  if (path.startsWith("@/")) {
    return join("src", path.slice(2));
  }
  return path;
};
