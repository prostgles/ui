import { getEntries } from "@common/utils";
import { getJSONBSchemaValidationError } from "prostgles-types";
import type {
  ProstglesService,
  RunningServiceInstance,
} from "./ServiceManagerTypes";

export const getServiceEndoints = <S extends ProstglesService>({
  serviceName,
  endpoints,
  baseUrl,
}: {
  serviceName: string;
  baseUrl: string;
  endpoints: ProstglesService["endpoints"];
}): RunningServiceInstance<S>["endpoints"] => {
  return Object.fromEntries(
    getEntries(endpoints).map(
      ([endpoint, { inputSchema, outputSchema, method }]) => [
        endpoint,
        async (args: unknown) => {
          if (!inputSchema && args) {
            throw new Error("No input expected");
          }
          const validatedInput =
            inputSchema ?
              getJSONBSchemaValidationError(inputSchema, args)
            : undefined;
          if (validatedInput?.error !== undefined) {
            throw new Error(
              `Invalid input for endpoint ${endpoint} of service ${serviceName}: ${validatedInput.error}`,
            );
          }
          const response = await fetch(
            `${baseUrl}${endpoint}`,
            validatedInput ?
              {
                body: validatedInput.data as unknown as string,
                method,
              }
            : undefined,
          );
          if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(
              `Error calling endpoint ${endpoint} of service ${serviceName}: ${response.status} ${response.statusText} ${errorText}`,
            );
          }

          if (outputSchema) {
            const responseData = await response.json();
            const validatedOutput = getJSONBSchemaValidationError(
              outputSchema,
              responseData,
            );
            if (validatedOutput.error !== undefined) {
              throw new Error(
                `Invalid output from endpoint ${endpoint} of service ${serviceName}: ${validatedOutput.error}`,
              );
            }
            //@ts-ignore
            return validatedOutput.data as unknown;
          }

          return undefined;
        },
      ],
    ),
  ) as RunningServiceInstance<S>["endpoints"];
};
