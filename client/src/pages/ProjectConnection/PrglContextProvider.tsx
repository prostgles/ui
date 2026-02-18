import React, { createContext, useContext, useEffect } from "react";
import { CommandPalette } from "src/app/CommandPalette/CommandPalette";
import { createStore } from "src/hooks/createStore";
import type { Prgl } from "../../App";

const PrglContext = createContext<Prgl | undefined>(undefined);

export const PrglProvider = ({
  prgl,
  children,
}: {
  prgl: Prgl;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    prglStateStore.setState({ loaded: true });
    return () => {
      prglStateStore.setState({ loaded: false });
    };
  }, [prgl]);
  return (
    <PrglContext.Provider value={prgl}>
      <CommandPalette
        isElectron={prgl.serverState.isElectron}
        prglLoaded={true}
      />
      {children}
    </PrglContext.Provider>
  );
};

export const usePrgl = () => {
  const context = useContext(PrglContext);
  if (context === undefined) {
    throw new Error("usePrgl must be used within a PrglProvider");
  }
  return context;
};

export const prglStateStore = createStore<{
  loaded: boolean;
}>({
  loaded: false,
});
