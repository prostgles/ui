import type { ProstglesState } from "@common/electronInitTypes";
import type { DBSSchema } from "@common/publishUtils";
import { tableMightBeUndefinedDueToAccessControl } from "@common/utils";
import { PrglContext } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import type { ServerFunctionHandler } from "prostgles-client/dist/prostgles";
import React, { createContext, useContext, useMemo } from "react";
import type { Prgl, PrglReadyState, Theme } from "src/App";

const PrglCoreContext = createContext<PrglReadyState | undefined>(undefined);

export const PrglCoreProvider = ({
  prglCore,
  children,
  theme,
  serverState,
}: {
  prglCore: PrglReadyState;
  children: React.ReactNode;
  theme: Theme;
  serverState: ProstglesState;
}) => {
  const { dbs, dbsTables, dbsSql, dbsMethods } = prglCore;

  const connection = usePromise(
    async () =>
      tableMightBeUndefinedDueToAccessControl(dbs.connections)?.findOne({
        is_state_db: true,
      }),
    [dbs.connections],
  );
  const prglFromCore = useMemo(
    () =>
      ({
        ...prglCore,
        db: dbs,
        tables: dbsTables,
        sql: dbsSql,
        methods: dbsMethods as ServerFunctionHandler,
        dbKey: "",
        connection: connection ?? ({} as DBSSchema["connections"]),
        connectionId: connection?.id ?? -1,
        databaseId: -1,
        projectPath: "",
        serverState,
        theme,
        setTitle: () => {},
      }) as Prgl,
    [
      prglCore,
      dbs,
      dbsTables,
      dbsSql,
      dbsMethods,
      connection,
      serverState,
      theme,
    ],
  );

  return (
    <PrglCoreContext.Provider value={prglCore}>
      <PrglContext.Provider value={prglFromCore}>
        {children}
      </PrglContext.Provider>
    </PrglCoreContext.Provider>
  );
};

export const usePrglCore = () => {
  const context = useContext(PrglCoreContext);
  if (context === undefined) {
    throw new Error("usePrglCore must be used within a PrglCoreProvider");
  }
  return context;
};
