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
      ([endpoint, { inputSchema, outputSchema, method, inputType }]) => [
        endpoint,
        async (args: unknown, fetchOptions) => {
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

          const { data } = validatedInput ?? {};
          const asQueryOrBody =
            (inputType ?? method === "POST") ? "body" : "query";
          const query =
            asQueryOrBody === "query" && data ?
              `?${new URLSearchParams(
                data as Record<string, string>,
              ).toString()}`
            : "";

          const response = await fetch(`${baseUrl}${endpoint}${query}`, {
            ...fetchOptions,
            body:
              asQueryOrBody === "body" && data ?
                JSON.stringify(data)
              : undefined,
            method: method,
          });
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
              {
                allowExtraProperties: true,
              },
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
