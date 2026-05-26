import React, { createContext, useContext } from "react";
import type { PrglReadyState } from "src/App";

const PrglCoreContext = createContext<PrglReadyState | undefined>(undefined);

export const PrglCoreProvider = ({
  prglCore,
  children,
}: {
  prglCore: PrglReadyState;
  children: React.ReactNode;
}) => {
  return (
    <PrglCoreContext.Provider value={prglCore}>
      {children}
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
