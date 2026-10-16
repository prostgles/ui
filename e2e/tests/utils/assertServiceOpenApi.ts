import * as assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getJSONSchemaObject, type JSONB } from "prostgles-types";
import { getServiceDockerResources } from "../../../server/dist/server/src/dockerRuntime";
import type { ProstglesService } from "../../../server/dist/server/src/ServiceManager/ServiceManagerTypes";

const execFileAsync = promisify(execFile);

type JsonSchema = {
  $ref?: string;
  additionalProperties?: boolean | JsonSchema;
  anyOf?: JsonSchema[];
  const?: unknown;
  enum?: unknown[];
  items?: JsonSchema | JsonSchema[];
  oneOf?: JsonSchema[];
  prefixItems?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type?: string;
};

type OpenApiOperation = {
  parameters?: {
    in: string;
    name: string;
    required?: boolean;
    schema?: JsonSchema;
  }[];
  requestBody?: { content?: Record<string, { schema?: JsonSchema }> };
  responses?: Record<
    string,
    { content?: Record<string, { schema?: JsonSchema }> }
  >;
};

export type OpenApiDocument = {
  components: { schemas: Record<string, JsonSchema> };
  paths: Record<
    string,
    Partial<
      Record<
        Lowercase<ProstglesService["endpoints"][string]["method"]>,
        OpenApiOperation
      >
    >
  >;
};

export const assertServiceOpenApi = async (
  serviceName: string,
  service: ProstglesService,
) => {
  const openApi = await getServiceOpenApi(serviceName, service);
  assertServiceOpenApiDocument(service, openApi);
};

export const assertServiceOpenApiDocument = (
  service: ProstglesService,
  openApi: OpenApiDocument,
) => {
  for (const [endpoint, localEndpoint] of Object.entries(service.endpoints)) {
    if (localEndpoint.openApi === false) continue;
    const method = localEndpoint.method.toLowerCase() as Lowercase<
      typeof localEndpoint.method
    >;
    const operation = openApi.paths[endpoint]?.[method];
    assert.ok(
      operation,
      `${service.label} OpenAPI is missing ${localEndpoint.method} ${endpoint}`,
    );

    if (localEndpoint.inputSchema) {
      const requestSchema = getRequestSchema(operation, localEndpoint);
      assert.ok(requestSchema, `${endpoint} is missing its request schema`);
      assertCompatible(
        toJsonSchema(localEndpoint.inputSchema),
        requestSchema,
        openApi,
        `${endpoint} request`,
        { checkRequired: true },
      );
    }

    if (localEndpoint.outputSchema) {
      const responseSchema = getResponseSchema(operation);
      assert.ok(responseSchema, `${endpoint} is missing its response schema`);
      assertAnyCompatible(
        getVariants(responseSchema, openApi),
        toJsonSchema(localEndpoint.outputSchema),
        openApi,
        `${endpoint} response`,
        { consumerAllowsExtra: true, consumerPropertiesMustExist: true },
      );
    }
  }
};

const getServiceOpenApi = async (
  serviceName: string,
  service: ProstglesService,
) => {
  assert.ok(
    service.openApiEndpoint,
    `${service.label} has no OpenAPI endpoint`,
  );
  const { containerName } = getServiceDockerResources(serviceName);
  const { stdout } = await execFileAsync(
    "docker",
    ["inspect", "--format", "{{json .NetworkSettings.Ports}}", containerName],
    { encoding: "utf8" },
  );
  const ports = JSON.parse(stdout) as Record<
    string,
    { HostIp: string; HostPort: string }[] | null
  >;
  const binding = ports[`${service.port}/tcp`]?.[0];
  assert.ok(binding, `No published port found for ${containerName}`);
  const response = await fetch(
    `http://127.0.0.1:${binding.HostPort}${service.openApiEndpoint}`,
  );
  assert.equal(response.status, 200);
  return (await response.json()) as OpenApiDocument;
};

const getRequestSchema = (
  operation: OpenApiOperation,
  endpoint: ProstglesService["endpoints"][string],
) => {
  const inputType =
    endpoint.inputType ?? (endpoint.method === "POST" ? "body" : "query");
  if (inputType === "query") {
    const parameters = operation.parameters?.filter(
      (parameter) => parameter.in === "query" && parameter.schema,
    );
    return {
      type: "object",
      properties: Object.fromEntries(
        parameters?.map(({ name, schema }) => [name, schema!]) ?? [],
      ),
      required: parameters
        ?.filter(({ required }) => required)
        .map(({ name }) => name),
    } satisfies JsonSchema;
  }
  const contentType =
    inputType === "FormData" ? "multipart/form-data" : "application/json";
  return operation.requestBody?.content?.[contentType]?.schema;
};

const getResponseSchema = (operation: OpenApiOperation) => {
  const successResponse = Object.entries(operation.responses ?? {}).find(
    ([status]) => status.startsWith("2"),
  )?.[1];
  return (
    successResponse?.content?.["application/json"]?.schema ??
    Object.values(successResponse?.content ?? {})[0]?.schema
  );
};

type CompatibilityOptions = {
  checkRequired?: boolean;
  consumerAllowsExtra?: boolean;
  consumerPropertiesMustExist?: boolean;
};

const assertCompatible = (
  producer: JsonSchema,
  consumer: JsonSchema,
  openApi: OpenApiDocument,
  path: string,
  options: CompatibilityOptions,
) => {
  const error = getCompatibilityError(
    producer,
    consumer,
    openApi,
    path,
    options,
  );
  assert.equal(error, undefined, error);
};

const assertAnyCompatible = (
  producers: JsonSchema[],
  consumer: JsonSchema,
  openApi: OpenApiDocument,
  path: string,
  options: CompatibilityOptions,
) => {
  const errors = producers.map((producer) =>
    getCompatibilityError(producer, consumer, openApi, path, options),
  );
  assert.ok(
    errors.some((error) => error === undefined),
    `${path}: no compatible response variant (${errors.join("; ")})`,
  );
};

const getCompatibilityError = (
  producerInput: JsonSchema,
  consumerInput: JsonSchema,
  openApi: OpenApiDocument,
  path: string,
  options: CompatibilityOptions,
): string | undefined => {
  const producer = resolveSchema(producerInput, openApi);
  const consumer = resolveSchema(consumerInput, openApi);
  const producerVariants = producer.anyOf ?? producer.oneOf;
  if (producerVariants) {
    return producerVariants
      .map((variant) =>
        getCompatibilityError(variant, consumer, openApi, path, options),
      )
      .find(Boolean);
  }
  const consumerVariants = consumer.anyOf ?? consumer.oneOf;
  if (consumerVariants) {
    const errors = consumerVariants.map((variant) =>
      getCompatibilityError(producer, variant, openApi, path, options),
    );
    return errors.some((error) => error === undefined) ? undefined : (
        `${path}: no compatible union variant (${errors.join("; ")})`
      );
  }

  const producerValues =
    producer.enum ??
    (producer.const !== undefined ? [producer.const] : undefined);
  if (producerValues) {
    const rejected = producerValues.filter(
      (value) => !schemaAcceptsValue(consumer, value, openApi),
    );
    return rejected.length ?
        `${path}: values not accepted: ${JSON.stringify(rejected)}`
      : undefined;
  }
  if (consumer.enum || consumer.const !== undefined) {
    if (
      producer.type === "null" &&
      schemaAcceptsValue(consumer, null, openApi)
    ) {
      return;
    }
    return `${path}: ${producer.type ?? "any"} is wider than the accepted enum`;
  }

  if (!producer.type || !consumer.type) return;
  if (
    producer.type !== consumer.type &&
    !(producer.type === "integer" && consumer.type === "number")
  ) {
    return `${path}: ${producer.type} is not ${consumer.type}`;
  }
  if (producer.type === "array") {
    const producerTuple = getTupleItems(producer);
    const consumerTuple = getTupleItems(consumer);
    if (producerTuple || consumerTuple) {
      if (
        !producerTuple ||
        !consumerTuple ||
        producerTuple.length !== consumerTuple.length
      ) {
        return `${path}: tuple shapes differ`;
      }
      return producerTuple
        .map((item, index) =>
          getCompatibilityError(
            item,
            consumerTuple[index]!,
            openApi,
            `${path}[${index}]`,
            options,
          ),
        )
        .find(Boolean);
    }
    if (producer.items && consumer.items) {
      return getCompatibilityError(
        producer.items as JsonSchema,
        consumer.items as JsonSchema,
        openApi,
        `${path}[]`,
        options,
      );
    }
    return;
  }
  if (producer.type !== "object") return;

  if (options.consumerPropertiesMustExist) {
    const missing = Object.keys(consumer.properties ?? {}).filter(
      (key) => !producer.properties?.[key],
    );
    if (missing.length)
      return `${path}: response fields disappeared: ${missing.join(", ")}`;
  }
  if (options.checkRequired) {
    const missing = (consumer.required ?? []).filter(
      (key) => !producer.required?.includes(key),
    );
    if (missing.length)
      return `${path}: missing required fields ${missing.join(", ")}`;
  }
  for (const [key, property] of Object.entries(producer.properties ?? {})) {
    const accepted = consumer.properties?.[key];
    if (!accepted) {
      if (
        options.consumerAllowsExtra ||
        consumer.additionalProperties === true
      ) {
        continue;
      }
      if (!isSchema(consumer.additionalProperties))
        return `${path}.${key}: field is missing`;
      const error = getCompatibilityError(
        property,
        consumer.additionalProperties,
        openApi,
        `${path}.${key}`,
        options,
      );
      if (error) return error;
      continue;
    }
    const error = getCompatibilityError(
      property,
      accepted,
      openApi,
      `${path}.${key}`,
      options,
    );
    if (error) return error;
  }
  if (isSchema(producer.additionalProperties)) {
    if (options.consumerAllowsExtra || consumer.additionalProperties === true) {
      return;
    }
    if (!isSchema(consumer.additionalProperties))
      return `${path}: additional properties are not accepted`;
    return getCompatibilityError(
      producer.additionalProperties,
      consumer.additionalProperties,
      openApi,
      `${path}.*`,
      options,
    );
  }
};

const toJsonSchema = (schema: unknown) =>
  getJSONSchemaObject(schema as JSONB.FieldType) as JsonSchema;

const getVariants = (schema: JsonSchema, openApi: OpenApiDocument) => {
  const resolved = resolveSchema(schema, openApi);
  return resolved.anyOf ?? resolved.oneOf ?? [schema];
};

const resolveSchema = (
  schema: JsonSchema,
  openApi: OpenApiDocument,
): JsonSchema => {
  if (!schema.$ref) return schema;
  const prefix = "#/components/schemas/";
  assert.ok(schema.$ref.startsWith(prefix), `Unsupported ref ${schema.$ref}`);
  const resolved = openApi.components.schemas[schema.$ref.slice(prefix.length)];
  assert.ok(resolved, `Missing schema ${schema.$ref}`);
  return resolved;
};

const schemaAcceptsValue = (
  schemaInput: JsonSchema,
  value: unknown,
  openApi: OpenApiDocument,
): boolean => {
  const schema = resolveSchema(schemaInput, openApi);
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants)
    return variants.some((variant) =>
      schemaAcceptsValue(variant, value, openApi),
    );
  if (schema.const !== undefined) return Object.is(schema.const, value);
  if (schema.enum)
    return schema.enum.some((allowed) => Object.is(allowed, value));
  if (!schema.type) return true;
  if (schema.type === "null") return value === null;
  if (schema.type === "integer") return Number.isInteger(value);
  return typeof value === schema.type;
};

const getTupleItems = (schema: JsonSchema) =>
  schema.prefixItems ??
  (Array.isArray(schema.items) ? schema.items : undefined);

const isSchema = (value: unknown): value is JsonSchema =>
  typeof value === "object" && value !== null && !Array.isArray(value);
