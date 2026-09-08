import { strict } from "assert";
import { describe, test } from "node:test";
import { ServiceManager } from "./ServiceManager";
import { prostglesServices } from "./ServiceManagerTypes";

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

  await test("Enable speechToText", async () => {
    if (IS_GITHUB_WORKER) {
      return;
    }
    let logText = "";
    const serviceManager = await ServiceManager.create(
      {
        services: prostglesServices,
        serviceRoot: "src/ServiceManager/services",
      },
      undefined,
    );
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
    serviceManager.destroy();
  });
});
