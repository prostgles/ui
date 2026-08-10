import type { SchemaConfig } from "prostgles";
import { CONFIG_TEST } from "./constants";

export const functions: NonNullable<SchemaConfig["functions"]> = (params) => ({
  [CONFIG_TEST.configFunctionName]: {
    run:
      params?.user?.type === "admin" ?
        () => CONFIG_TEST.configFunctionResult
      : undefined,
  },
  [CONFIG_TEST.deniedFunctionName]: {
    run: undefined,
  },
});
