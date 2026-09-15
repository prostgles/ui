import React, { useContext, useState } from "react";
import {
  MCPServerConfigEditor,
  type MCPServerConfigProps,
  type MCPServerEnabledConfig,
} from "./MCPServerConfigEditor";

type MCPServerConfigContext = {
  setServerToConfigure: (
    p: Omit<MCPServerConfigProps, "onDone" | "dbs">,
  ) => Promise<void | MCPServerEnabledConfig>;
};

const MCPServerConfigContext = React.createContext<
  MCPServerConfigContext | undefined
>(undefined);

export const MCPServerConfigProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [serverToConfigure, setServerToConfigure] =
    useState<MCPServerConfigProps>();

  const value = React.useMemo(() => {
    return {
      setServerToConfigure: async (
        props: Omit<MCPServerConfigProps, "onDone">,
      ) => {
        return new Promise<MCPServerEnabledConfig | void>((resolve) => {
          setServerToConfigure({
            ...props,
            onDone: (enabled) => {
              resolve(enabled);
            },
          });
        });
      },
    };
  }, []);

  return (
    <MCPServerConfigContext.Provider value={value}>
      {children}
      {serverToConfigure && (
        <MCPServerConfigEditor
          {...serverToConfigure}
          onDone={(enabled) => {
            serverToConfigure.onDone(enabled);
            setServerToConfigure(undefined);
          }}
        />
      )}
    </MCPServerConfigContext.Provider>
  );
};

export const useMCPServerConfig = () => {
  const context = useContext(MCPServerConfigContext);
  if (!context) {
    throw new Error(
      "useMCPServerConfig must be used within a MCPServerConfigProvider",
    );
  }
  return context;
};
