import { strict } from "assert";
import { openAsBlob } from "fs";
import { describe, test } from "node:test";
import { ServiceManager } from "./ServiceManager";
import { prostglesServices } from "./ServiceManagerTypes";
import { executeDockerCommand } from "@src/McpHub/DockerSandbox/executeDockerCommand";
import { getServiceDockerResources } from "@src/dockerRuntime";

export const IS_GITHUB_WORKER = process.env.CI === "true";

void describe("Service manager tests", async () => {
  await test("Initialises built-in and additional services without name clashes", async () => {
    let insertedServiceNames: string[] = [];
    const serviceManager = await ServiceManager.create(
      {
        services: prostglesServices,
        serviceRoot: "built-in-services",
      },
      {
        services: {
          insertMany: (services: { name: string }[]) => {
            insertedServiceNames = services.map(({ name }) => name);
            return Promise.resolve();
          },
          find: () => Promise.resolve([]),
        },
      } as unknown as Parameters<typeof ServiceManager.create>[1],
    );
    const extendedServiceManager = await serviceManager.addServices({
      services: { appService: prostglesServices.documents },
      serviceRoot: "app-services",
    });

    strict.equal(
      extendedServiceManager.services.appService,
      prostglesServices.documents,
    );
    strict.equal(
      extendedServiceManager.getServiceRoot("documents"),
      "built-in-services",
    );
    strict.equal(
      extendedServiceManager.getServiceRoot("appService"),
      "app-services",
    );
    await strict.rejects(() =>
      extendedServiceManager.addServices({
        services: { documents: prostglesServices.documents },
        serviceRoot: "app-services",
      }),
    );

    strict.deepEqual(insertedServiceNames.sort(), [
      "appService",
      "documents",
      "speechToText",
      "webSearchSearxng",
    ]);
  });

  await test("Reports Docker startup errors with container logs and exit code", async (testContext) => {
    const serviceName = `startup-error-test-${process.pid}`;
    const serviceManager = await ServiceManager.create(
      {
        services: {
          [serviceName]: {
            icon: "",
            label: "Startup error test",
            description: "Service that fails before its healthcheck",
            buildContext: "startupError",
            port: 8000,
            healthCheck: { endpoint: "/health" },
            endpoints: {},
          },
        },
        serviceRoot: "src/ServiceManager/fixtures",
      },
      undefined,
    );
    testContext.after(async () => {
      serviceManager.destroy();
      const { imageName } = getServiceDockerResources(serviceName);
      await executeDockerCommand(["image", "rm", imageName], {
        timeout: 10_000,
      });
    });

    await strict.rejects(
      serviceManager.enableService(serviceName, () => {}),
      (error: unknown) => {
        strict.ok(error instanceof Error);
        strict.ok(error.message.includes("Recent container logs:"));
        strict.ok(error.message.includes("missing-service-binary"));
        strict.ok(error.cause instanceof Error);
        strict.match(error.cause.message, /exit code: [1-9]\d*/);
        strict.ok(error.cause.cause);
        const serviceInstance = serviceManager.getService(serviceName);
        strict.equal(serviceInstance?.status, "error");
        strict.equal(serviceInstance.error, error.cause);
        return true;
      },
    );
  });

  await test("Enable speechToText", async (testContext) => {
    if (IS_GITHUB_WORKER) {
      return;
    }
    let logText = "";
    const serviceManager: ServiceManager<typeof prostglesServices> =
      await ServiceManager.create(
        {
          services: prostglesServices,
          serviceRoot: "src/ServiceManager/services",
        },
        undefined,
      );
    testContext.after(() => serviceManager.destroy());
    const res = await serviceManager.enableService("speechToText", (logs) => {
      const lastLog = logs.at(-1)?.text;
      console.warn(lastLog);
      logText += lastLog;
    });
    strict.equal(res.status, "running");
    strict.equal(
      logText.includes("Running on http://127.0.0.1:8000"),
      true,
      "Service did not start correctly",
    );
    strict.ok(res.endpoints["/transcribe"]);
    // @ts-expect-error Audio must be a Blob.
    ({ audio: "" }) satisfies Parameters<(typeof res.endpoints)["/transcribe"]>[0];
    const transcriptionResult = await res.endpoints["/transcribe"]({
      audio: await openAsBlob("../e2e/tests/testAskLLM/hello.mp3", {
        type: "audio/mpeg",
      }),
    });
    strict.ok("transcription" in transcriptionResult);
    // @ts-expect-error Transcription responses have no unknown field.
    transcriptionResult.invalid;
    strict.equal(transcriptionResult.success, true);
    strict.equal(transcriptionResult.transcription, "Hello.");
  });
});
