import React, { createContext, useContext } from "react";
import type { Prgl } from "../../App";

const PrglContext = createContext<Prgl | undefined>(undefined);

export const PrglProvider = ({
  prgl,
  children,
}: {
  prgl: Prgl;
  children: React.ReactNode;
}) => {
  return <PrglContext.Provider value={prgl}>{children}</PrglContext.Provider>;
};

export const usePrgl = () => {
  const context = useContext(PrglContext);
  if (context === undefined) {
    throw new Error("usePrgl must be used within a PrglProvider");
  }
  return context;
};
