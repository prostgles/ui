import { getContainerInfo } from "./getContainerInfo";

/**
 * Wait for container to be ready
 */
export const waitForContainer = async (containerId: string): Promise<void> => {
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const info = await getContainerInfo(containerId);
      console.error(info);
      if (info && (info.status === "running" || info.status === "exited")) {
        return;
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
