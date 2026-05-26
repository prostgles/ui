import { runDockerForWebApp } from "@src/serverFunctions/adminServerFunctions/webApp/runDockerForWebApp";

export const installDependenciesIfNeeded = async ({
  dependencies,
  devDependencies,
  web_app_directory,
}: {
  dependencies: string[] | undefined;
  devDependencies: string[] | undefined;
  web_app_directory: string;
}) => {
  if (dependencies?.length || devDependencies?.length) {
    const commands: string[] = [];
    if (dependencies?.length) {
      commands.push(`npm install --silent ${dependencies.join(" ")}`);
    }
    if (devDependencies?.length) {
      commands.push(`npm install --silent -D ${devDependencies.join(" ")}`);
    }
    const installDepsResult = await runDockerForWebApp({
      web_app_directory,
      image: "node:24-slim",
      shCommand: `cd client && ${commands.join(" && ")}`,
    });

    if (installDepsResult.state !== "close") {
      return Promise.reject(installDepsResult);
    }
  }
};
