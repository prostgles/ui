import { strict } from "assert";
import { test } from "node:test";
import { checkConfigAccess } from "./checkConfigAccess";

type WebConfig = Parameters<typeof checkConfigAccess>[1];

const makeConfig = (access: WebConfig["access"]): WebConfig => ({ access });

const getErrorMessage = async (promise: Promise<void>) => {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  return "";
};

void test("checkConfigAccess allows matching URLs in allow mode", async () => {
  const config = makeConfig({
    mode: "allow",
    urls: ["example.com"],
    blockInternalSubnets: true,
    internalSubnets: [],
  });

  await checkConfigAccess("https://docs.example.com/path", config);

  const message = await getErrorMessage(
    checkConfigAccess("https://other.test/path", config),
  );

  strict.ok(message.includes("is not allowed"));
});

void test("checkConfigAccess denies matching URLs in deny mode", async () => {
  const config = makeConfig({
    mode: "deny",
    urls: ["localhost"],
    blockInternalSubnets: true,
    internalSubnets: [],
  });

  const message = await getErrorMessage(
    checkConfigAccess("http://localhost:3000/status", config),
  );

  strict.ok(message.includes("is denied"));
});

void test("checkConfigAccess blocks direct IPs in blocked subnets", async () => {
  const config = makeConfig({
    mode: "deny",
    urls: [],
    blockInternalSubnets: true,
    internalSubnets: ["127.0.0.0/8", "::1/128"],
  });

  const ipv4Message = await getErrorMessage(
    checkConfigAccess("http://127.0.0.1/status", config),
  );
  strict.ok(ipv4Message.includes("127.0.0.1"));
  strict.ok(ipv4Message.includes("127.0.0.0/8"));

  const ipv6Message = await getErrorMessage(
    checkConfigAccess("http://[::1]/status", config),
  );
  strict.ok(ipv6Message.includes("::1"));
  strict.ok(ipv6Message.includes("::1/128"));
});

void test("checkConfigAccess supports IPv4-mapped IPv6 blocked subnets", async () => {
  const config = makeConfig({
    mode: "deny",
    urls: [],
    blockInternalSubnets: true,
    internalSubnets: ["::ffff:127.0.0.0/120"],
  });

  const message = await getErrorMessage(
    checkConfigAccess("http://127.0.0.1/status", config),
  );

  strict.ok(message.includes("127.0.0.1"));
  strict.ok(message.includes("::ffff:127.0.0.0/120"));
});

void test("checkConfigAccess blocks hostnames that resolve into blocked subnets", async () => {
  const config = makeConfig({
    mode: "deny",
    urls: [],
    blockInternalSubnets: true,
    internalSubnets: ["127.0.0.0/8", "::1/128"],
  });

  const message = await getErrorMessage(
    checkConfigAccess("http://localhost/status", config),
  );

  strict.ok(message.includes("blocked by MCP server configuration"));
});

void test("checkConfigAccess ignores blocked subnets in unrestricted mode", async () => {
  const config = makeConfig({
    mode: "unrestricted",
    urls: [],
    blockInternalSubnets: true,
    internalSubnets: ["not-a-cidr"],
  });

  await checkConfigAccess("http://127.0.0.1/status", config);
});
