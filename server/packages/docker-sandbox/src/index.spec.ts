import test from "node:test";
import { DockerSandboxMCPServer } from ".";
import { strict } from "assert";

void test("createContainer invalid params", async () => {
  const server = new DockerSandboxMCPServer();
  const config = {
    files: [],
    networkMode: "bridgeInvalid" as unknown as "bridge",
  };
  const result = await server
    .createSandbox(config)
    .catch((err) => err as Error);
  strict.equal(result instanceof Error, true);
  strict.equal(
    (result as Error)
      .toString()
      .includes("networkMode is of invalid type. Expecting"),
    true,
  );
});
