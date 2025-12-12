import type { DBS } from "@src/index";

const servers: Map<string, any> = new Map();

const init = async (dbs: DBS) => {
  const sub = await dbs.mcp_servers.subscribe(
    {
      command: "prostgles-local",
    },
    {},
    (serverRecords) => {
      for (const serverRecord of serverRecords) {
        if (!servers.has(serverRecord.name)) {
          const prostglesMcpHub = getProstglesMcpHub(dbs);
          servers.set(serverRecord.name, prostglesMcpHub);
        }
      }
    },
  );

  const destroy = () => {};
};

export const getProstglesMcpHub = (dbs: DBS) => {};
