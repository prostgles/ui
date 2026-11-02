import type {
  FunctionOptions,
  FunctionOptionsMap,
} from "@common/functionOptions";
import type { ClientServerFunctionSchema } from "prostgles-types";

export const modifyClientFunctionSchema =
  (
    configuredOptions: FunctionOptionsMap | null | undefined,
    publishedOptions: FunctionOptionsMap,
  ) =>
  (method: ClientServerFunctionSchema): ClientServerFunctionSchema => ({
    ...method,
    function_options: {
      ...(method.function_options as FunctionOptions | undefined),
      ...publishedOptions[method.name],
      ...configuredOptions?.[method.name],
    },
  });
