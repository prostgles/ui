import { getContainerInfo } from "./getContainerInfo";

/**
 * Wait for container to be ready
 */
export const waitForContainer = async (containerId: string) => {
  const maxAttempts = 30;
  let attempts = 0;
  let latestInfo: Awaited<ReturnType<typeof getContainerInfo>>;
  while (attempts < maxAttempts) {
    try {
      latestInfo = await getContainerInfo(containerId);
      console.error(latestInfo);
      if (
        latestInfo &&
        (latestInfo.status === "running" || latestInfo.status === "exited")
      ) {
        return latestInfo;
      }
    } catch (error) {
      // Continue waiting
      console.error(`Attempt ${attempts + 1}: Container not ready yet`, error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error("Container failed to start within timeout");
};
