import { createFunctionGroupDefiner } from "@prostgles/prostgles";
import { CONFIG_TEST } from "./constants";

const defineFunctionGroup = createFunctionGroupDefiner();

export const functions = {
  adminFuncs: defineFunctionGroup({
    userFilter: { type: "admin" },
    functions: {
      [CONFIG_TEST.configFunctionName]: {
        run: () => CONFIG_TEST.configFunctionResult,
      },
    },
  }),
  deniedFunction: defineFunctionGroup({
    userFilter: { type: "invalidId" },
    functions: {
      [CONFIG_TEST.deniedFunctionName]: {
        run: () => CONFIG_TEST.configFunctionResult,
      },
    },
  }),
};
