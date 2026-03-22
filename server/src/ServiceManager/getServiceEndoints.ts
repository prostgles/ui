import { getEntries } from "@common/utils";
import { getJSONBSchemaValidationError, isObject } from "prostgles-types";
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
            inputType ?? (method === "POST" ? "body" : "query");
          const query =
            asQueryOrBody === "query" && data ?
              `?${new URLSearchParams(
                data as Record<string, string>,
              ).toString()}`
            : "";

          const { body, headers } = (() => {
            if (asQueryOrBody === "FormData") {
              if (!isObject(data)) {
                throw new Error("FormData input must be an object");
              }
              const formData = new FormData();
              getEntries(data).forEach(([key, value]) => {
                const appendValue = (value: unknown) => {
                  if (value instanceof Blob) {
                    formData.append(key, value);
                  } else if (typeof value === "string") {
                    formData.append(key, value);
                  } else {
                    formData.append(key, JSON.stringify(value));
                  }
                };

                if (Array.isArray(value)) {
                  value.forEach((v) => {
                    appendValue(v);
                  });
                } else {
                  appendValue(value);
                }
              });
              return { body: formData };
            }
            if (asQueryOrBody !== "body") {
              return { body: undefined };
            }
            if (typeof data === "string") {
              return { body: data };
            }
            return {
              body: JSON.stringify(data),
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
            };
          })();
          const response = await fetch(`${baseUrl}${endpoint}${query}`, {
            headers,
            ...fetchOptions,
            body,
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
