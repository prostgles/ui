import {
  createFunctionGroupDefiner,
  createFunctionsDefiner,
  defineFunction,
} from "@prostgles/prostgles";
import { CONFIG_TEST } from "./constants";

const defineFunctionGroup = createFunctionGroupDefiner();
const defineFunctions = createFunctionsDefiner();

const adminFunctions = defineFunctions({
  [CONFIG_TEST.configFunctionName]: defineFunction({
    run: () => ({ message: CONFIG_TEST.configFunctionResult }),
  }),
});

export const functions = {
  adminFuncs: defineFunctionGroup({
    userFilter: { type: "admin" },
    functions: adminFunctions,
  }),
  deniedFunction: defineFunctionGroup({
    userFilter: { type: "invalidId" },
    functions: {
      [CONFIG_TEST.deniedFunctionName]: defineFunction({
        input: { value: "string" },
        run: ({ value }) => {
          value satisfies string;
          return value.length;
        },
      }),
    },
  }),
};
