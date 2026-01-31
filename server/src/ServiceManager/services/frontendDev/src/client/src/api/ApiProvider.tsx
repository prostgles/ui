import {
  useProstglesClient,
  type OnReadyParams,
  type ProstglesClientState,
  type UseProstglesClientProps,
} from "prostgles-client";
import { createContext, useContext, type ReactNode } from "react";
import type {
  DBGeneratedSchema,
  GeneratedFunctionSchema,
  DBSchema,
} from "./DBGeneratedSchema";

type U = Pick<DBSchema["users"], "id" | "type">;

type ProstglesContextValue = ProstglesClientState<
  OnReadyParams<DBGeneratedSchema, GeneratedFunctionSchema, U>
>;

const ProstglesContext = createContext<ProstglesContextValue | undefined>(
  undefined,
);

export const useProstgles = () => {
  const ctx = useContext(ProstglesContext);
  if (!ctx) {
    throw new Error("useProstgles must be used within ProstglesProvider");
  }
  return ctx;
};

export const ProstglesProvider = ({
  children,
  ...props
}: UseProstglesClientProps & { children: ReactNode }) => {
  const value = useProstglesClient<
    DBGeneratedSchema,
    GeneratedFunctionSchema,
    U
  >(props);
  return (
    <ProstglesContext.Provider value={value}>
      {children}
    </ProstglesContext.Provider>
  );
};
