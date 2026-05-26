import { createServerFunctionWithContext } from "prostgles-server";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";

export const getDefineAdminFunction = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const defineAdminFunction = createServerFunctionWithContext(
    context?.type === "admin" ? context : undefined,
  );
  return { defineAdminFunction };
};
