import React, { createContext, useContext } from "react";
import type { AppContextProps } from "src/App";

const AppStateContext = createContext<AppContextProps | undefined>(undefined);

export const AppContextProvider = ({
  appContextProps,
  children,
}: {
  appContextProps: AppContextProps;
  children: React.ReactNode;
}) => {
  return (
    <AppStateContext.Provider value={appContextProps}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("usePrgl must be used within a PrglProvider");
  }
  return context;
};
