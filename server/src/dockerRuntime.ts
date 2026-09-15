const DEFAULT_INSTANCE_ID = "prostgles";

export const DEFAULT_DOCKER_NETWORK_NAME = "prostgles-bridge-net";

const toDockerName = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
    .toLowerCase();

export const getDockerRuntime = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const networkName = environment.PROSTGLES_DOCKER_NETWORK?.trim() || undefined;
  const configuredInstanceId = environment.PROSTGLES_INSTANCE_ID?.trim();
  const instanceId =
    configuredInstanceId ? toDockerName(configuredInstanceId) : undefined;

  if (configuredInstanceId && !instanceId) {
    throw new Error("PROSTGLES_INSTANCE_ID must contain a letter or number.");
  }

  return { instanceId, networkName };
};

export const getServiceDockerResources = (
  serviceName: string,
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const serviceId = toDockerName(serviceName);
  if (!serviceId)
    throw new Error("Service name must contain a letter or number.");

  const { instanceId, networkName } = getDockerRuntime(environment);
  const containerName = `${instanceId ?? DEFAULT_INSTANCE_ID}-service-${serviceId}`;

  return {
    containerName,
    imageName: instanceId ? containerName : serviceId,
    networkName,
    volumePrefix: containerName,
  };
};

export const getServiceDockerConnectivity = ({
  containerName,
  containerPort,
  hostPort,
  networkName,
}: {
  containerName: string;
  containerPort: number;
  hostPort: number;
  networkName?: string;
}) => {
  const baseHost =
    networkName ? `${containerName}:${containerPort}` : `127.0.0.1:${hostPort}`;
  return {
    baseUrl: `http://${baseHost}`,
    runArgs:
      networkName ?
        ["--network", networkName]
      : ["-p", `${baseHost}:${containerPort}`],
  };
};
