import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DOCKER_NETWORK_NAME,
  getDockerRuntime,
  getServiceDockerConnectivity,
  getServiceDockerResources,
} from "./dockerRuntime";

void test("preserves existing service Docker names without deployment variables", () => {
  assert.deepEqual(getServiceDockerResources("myService", {}), {
    containerName: "prostgles-service-my-service",
    imageName: "my-service",
    networkName: undefined,
    volumePrefix: "prostgles-service-my-service",
  });
});

void test("uses container DNS without publishing managed service ports", () => {
  assert.deepEqual(
    getServiceDockerConnectivity({
      containerName: "my-app-service-my-service",
      containerPort: 8080,
      hostPort: 8080,
      networkName: "my-app-runtime",
    }),
    {
      baseUrl: "http://my-app-service-my-service:8080",
      runArgs: ["--network", "my-app-runtime"],
    },
  );
});

void test("preserves loopback publishing outside a Docker runtime", () => {
  assert.deepEqual(
    getServiceDockerConnectivity({
      containerName: "prostgles-service-my-service",
      containerPort: 8080,
      hostPort: 49123,
    }),
    {
      baseUrl: "http://127.0.0.1:49123",
      runArgs: ["-p", "127.0.0.1:49123:8080"],
    },
  );
});

void test("namespaces service Docker resources in a configured runtime", () => {
  assert.deepEqual(
    getServiceDockerResources("myService", {
      PROSTGLES_DOCKER_NETWORK: "my-app-runtime",
      PROSTGLES_INSTANCE_ID: "My App",
    }),
    {
      containerName: "my-app-service-my-service",
      imageName: "my-app-service-my-service",
      networkName: "my-app-runtime",
      volumePrefix: "my-app-service-my-service",
    },
  );
});

void test("rejects an unusable configured instance id", () => {
  assert.throws(
    () => getDockerRuntime({ PROSTGLES_INSTANCE_ID: "---" }),
    /must contain a letter or number/,
  );
  assert.equal(DEFAULT_DOCKER_NETWORK_NAME, "prostgles-bridge-net");
});
