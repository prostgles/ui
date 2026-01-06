import { executeDockerCommand } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/executeDockerCommand";

export const dockerInspect = async (
  containerOrImageName: string,
): Promise<DockerInspectResult | undefined> => {
  try {
    const inspectData = await executeDockerCommand(
      ["inspect", containerOrImageName],
      {
        timeout: 10_000,
      },
    );
    const stdOut = inspectData.log.find((d) => d.type === "stdout")?.text;
    if (!stdOut) {
      return;
    }
    const [item, ...otherItems] = JSON.parse(stdOut) as DockerInspectResult[];
    if (item && !otherItems.length) {
      return item;
    }
  } catch (e) {
    console.warn(`docker inspect failed for ${containerOrImageName}:`, e);
  }
  return;
};

type DockerInspectResult = {
  Id: string;
  Created: string;
  Config: {
    Labels: Record<string, string>;
  };
};
