import { strict } from "assert";
import { openAsBlob } from "fs";
import { describe, test } from "node:test";
import { ServiceManager } from "./ServiceManager";
import {
  prostglesServices,
  type ProstglesService,
} from "./ServiceManagerTypes";
import * as dockerCommands from "@src/McpHub/DockerSandbox/executeDockerCommand";
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

  await test("Builds services with optional base-image refresh and reports startup errors", async (testContext) => {
    const serviceName = `startup-error-test-${process.pid}`;
    const service: ProstglesService = {
      icon: "",
      label: "Startup error test",
      description: "Service that fails before its healthcheck",
      buildContext: "startupError",
      port: 8000,
      healthCheck: { endpoint: "/health" },
      endpoints: {},
    };
    const serviceManager = await ServiceManager.create(
      {
        services: {
          [serviceName]: service,
        },
        serviceRoot: "src/ServiceManager/fixtures",
      },
      undefined,
    );
    testContext.after(async () => {
      serviceManager.destroy();
      const { imageName } = getServiceDockerResources(serviceName);
      await dockerCommands.executeDockerCommand(["image", "rm", imageName], {
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

    for (const pullBaseImages of [undefined, false, true, false]) {
      service.pullBaseImages = pullBaseImages;
      let buildLogCount = 0;
      const buildResult = await serviceManager.buildService(
        serviceName,
        (logs) => {
          buildLogCount += logs.length;
        },
      );
      strict.equal(buildResult, "close");
      strict.equal(
        buildLogCount > 0,
        !!pullBaseImages,
        `Cached service should only rebuild when pullBaseImages is true (${pullBaseImages})`,
      );
    }
  });

  await test("Restarts cached services and reports shutdown failures", async (testContext) => {
    const serviceName = `restart-test-${process.pid}`;
    const service = {
      icon: "",
      label: "Restart test",
      description: "HTTP server for service lifecycle tests",
      buildContext: "httpServer",
      port: 8000,
      healthCheck: { endpoint: "/health" },
      endpoints: {
        "/health": {
          method: "GET",
          description: "Health check",
          inputSchema: undefined,
          outputSchema: { type: "string" },
        },
      },
    } satisfies ProstglesService;
    const serviceManager = await ServiceManager.create(
      {
        services: { [serviceName]: service },
        serviceRoot: "src/ServiceManager/fixtures",
      },
      undefined,
    );
    testContext.after(async () => {
      await serviceManager.stopService(serviceName);
      const { imageName } = getServiceDockerResources(serviceName);
      await dockerCommands.executeDockerCommand(["image", "rm", imageName], {
        timeout: 10_000,
      });
    });

    const initialService = await serviceManager.enableService(
      serviceName,
      () => {},
    );
    strict.equal(await initialService.endpoints["/health"](undefined), "ready");
    /* Restart immediately while the previous container is being removed. */
    serviceManager.destroy();
    const restartedService = await serviceManager.enableService(
      serviceName,
      () => {},
    );
    strict.equal(restartedService.status, "running");
    strict.notEqual(restartedService, initialService);
    strict.equal(
      await restartedService.endpoints["/health"](undefined),
      "ready",
    );
    await serviceManager.stopService(serviceName);
    /* Stopping an already removed container is harmless. */
    await serviceManager.stopService(serviceName);

    /* A failed stop only succeeds when a successful listing confirms exact-name absence. */
    const { containerName } = getServiceDockerResources(serviceName);
    for (const stopState of ["error", "timed-out"] as const) {
      for (const [listingState, listedNames, shouldReject] of [
        ["close", `${containerName}\r\n`, true],
        ["close", `${containerName}-other\r\n`, false],
        ["close", "", false],
        ["error", "", true],
        ["timed-out", "", true],
      ] as const) {
        const stopCommand = testContext.mock.method(
          dockerCommands,
          "executeDockerCommand",
          (args: string[]): Promise<dockerCommands.ExecutionResult> => {
            const isListing = args[0] === "container";
            const state = isListing ? listingState : stopState;
            return Promise.resolve({
              state,
              command: args.join(" "),
              exitCode: state === "close" ? 0 : -1,
              timedOut: state === "timed-out",
              executionTime: 0,
              log:
                isListing ?
                  [
                    { type: "stdout", text: listedNames.slice(0, 5) },
                    { type: "stdout", text: listedNames.slice(5) },
                    { type: "stderr", text: containerName },
                  ]
                : [{ type: "stderr", text: "Shutdown failed" }],
            });
          },
        );
        try {
          if (shouldReject) {
            const expectedError = {
              message: `Failed to stop service ${serviceName} (${stopState}): Shutdown failed`,
            };
            await strict.rejects(
              serviceManager.stopService(serviceName),
              expectedError,
            );
            await strict.rejects(
              serviceManager.enableService(serviceName, () => {}),
              expectedError,
            );
          } else {
            await serviceManager.stopService(serviceName);
          }
        } finally {
          stopCommand.mock.restore();
        }
      }
    }
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
    ({ audio: "" }) satisfies Parameters<
      (typeof res.endpoints)["/transcribe"]
    >[0];
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
