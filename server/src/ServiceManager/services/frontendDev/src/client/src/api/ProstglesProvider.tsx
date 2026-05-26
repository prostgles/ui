import {
  useProstglesClient,
  type OnReadyParams,
  type UseProstglesClientProps,
} from "prostgles-client";
import { createContext, useContext, type ReactNode } from "react";
import type {
  DBGeneratedSchema,
  DBSchema,
  GeneratedFunctionSchema,
} from "./DBGeneratedSchema";
import { getSerialisableError } from "prostgles-types";

type U = DBSchema["users"];

type ProstglesContextValue = OnReadyParams<
  DBGeneratedSchema,
  GeneratedFunctionSchema,
  U
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

  if (value.isLoading) {
    return <div>Loading Prostgles Client...</div>;
  }
  if (value.hasError) {
    return (
      <div>
        Error loading Prostgles Client:{" "}
        {JSON.stringify(getSerialisableError(value.error))}
      </div>
    );
  }

  return (
    <ProstglesContext.Provider value={value}>
      {children}
    </ProstglesContext.Provider>
  );
};
