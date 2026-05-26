/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/no-use-before-define */

type JsonSchemaTypeName =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null"
  | "object"
  | "array";

type JsonSchema = {
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
  description?: string;
  type?: JsonSchemaTypeName | readonly JsonSchemaTypeName[];
  enum?: readonly unknown[];
  const?: unknown;
  oneOf?: readonly JsonSchema[];
  anyOf?: readonly JsonSchema[];
  allOf?: readonly JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema | readonly JsonSchema[];
  nullable?: boolean;
};

type RenderMode = "full" | "compact";

type JsonSchemaToTsOptions = {
  mode?: RenderMode; // default: 'full'
  indent?: string; // default: '  '
};

type RenderContext = {
  mode: RenderMode;
  indent: string;
  root: JsonSchema;
  resolvingRefs: Set<string>;
};

const DEFAULT_OPTIONS: Required<JsonSchemaToTsOptions> = {
  mode: "full",
  indent: "  ",
};

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;

/**
 * Converts a JSON Schema object to a TypeScript type string (no "type X =" wrapper).
 *
 * Full mode  (default): multi-line, indentation, JSDoc comments from descriptions.
 * Compact mode: single-line, no comments.
 */
export const getJsonSchemaAsTs = (
  schema: JsonSchema,
  options: JsonSchemaToTsOptions = {},
): string => {
  const ctx: RenderContext = {
    mode: options.mode ?? DEFAULT_OPTIONS.mode,
    indent: options.indent ?? DEFAULT_OPTIONS.indent,
    root: schema,
    resolvingRefs: new Set<string>(),
  };

  return renderSchema(schema, 0, ctx);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidIdentifier = (name: string): boolean => IDENTIFIER_RE.test(name);

const formatPropertyName = (name: string): string =>
  isValidIdentifier(name) ? name : JSON.stringify(name);

const sanitizeJsDocLine = (line: string): string =>
  line.replace(/\*\//gu, "*\\/");

const createJsDoc = (
  description: string | undefined,
  level: number,
  ctx: RenderContext,
): string => {
  if (ctx.mode === "compact" || !description?.trim()) return "";

  const pad = ctx.indent.repeat(level);
  const lines = description
    .split("\n")
    .map((line) => sanitizeJsDocLine(line.trim()));

  if (lines.length === 1) {
    return `${pad}/** ${lines[0]} */\n`;
  }

  const body = lines.map((line) => `${pad} * ${line}`).join("\n");
  return `${pad}/**\n${body}\n${pad} */\n`;
};

const literalToTs = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "number";
  if (typeof value === "boolean") return value ? "true" : "false";
  return "never";
};

const withNullable = (
  base: string,
  schema: JsonSchema,
  ctx: RenderContext,
): string => {
  const hasNullInTypeArray =
    Array.isArray(schema.type) && schema.type.includes("null");

  const shouldAddNull =
    schema.nullable === true && !hasNullInTypeArray && base !== "null";
  if (!shouldAddNull) return base;

  return ctx.mode === "compact" ? `${base} | null` : `${base} | null`;
};

const parenthesizeIfNeeded = (type: string): string =>
  type.includes("|") || type.includes("&") ? `(${type})` : type;

const joinTypes = (
  parts: readonly string[],
  joiner: "|" | "&",
  ctx: RenderContext,
): string => {
  const clean = [...new Set(parts.filter((p) => p.length > 0))];
  if (clean.length === 0) return "unknown";
  if (clean.length === 1) return clean[0]!;

  // const sep = ctx.mode === "compact" ? joiner : ` ${joiner} `;
  const sep = ` ${joiner} `;
  return clean.join(sep);
};

const resolveRef = (ref: string, root: JsonSchema): JsonSchema | undefined => {
  // Supports local refs only: #/$defs/Name or #/definitions/Name
  if (!ref.startsWith("#/")) return undefined;

  const path = ref
    .slice(2)
    .split("/")
    .map((seg) => seg.replace(/~1/gu, "/").replace(/~0/gu, "~"));

  let current: unknown = root;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) return undefined;
    current = current[key];
  }

  return isRecord(current) ? (current as JsonSchema) : undefined;
};

const renderObject = (
  schema: JsonSchema,
  level: number,
  ctx: RenderContext,
): string => {
  const entries = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);

  const lines: string[] = [];

  for (const [propName, propSchema] of entries) {
    const jsDoc = createJsDoc(propSchema.description, level + 1, ctx);
    const optionalMark = required.has(propName) ? "" : "?";
    const renderedType = renderSchema(propSchema, level + 1, ctx);

    if (ctx.mode === "full") {
      lines.push(
        `${jsDoc}${ctx.indent.repeat(level + 1)}${formatPropertyName(propName)}${optionalMark}: ${renderedType};`,
      );
    } else {
      lines.push(
        `${formatPropertyName(propName)}${optionalMark}:${renderedType}`,
      );
    }
  }

  if (schema.additionalProperties) {
    let apType = "unknown";
    if (schema.additionalProperties !== true) {
      apType = renderSchema(schema.additionalProperties, level + 1, ctx);
    }

    if (ctx.mode === "full") {
      lines.push(`${ctx.indent.repeat(level + 1)}[key: string]: ${apType};`);
    } else {
      lines.push(`[key:string]:${apType}`);
    }
  }

  if (ctx.mode === "compact") {
    return `{${lines.join(";")}}`;
  }

  if (lines.length === 0) return "{}";

  return `{\n${lines.join("\n")}\n${ctx.indent.repeat(level)}}`;
};

const renderArray = (
  schema: JsonSchema,
  level: number,
  ctx: RenderContext,
): string => {
  if (isArray(schema.items)) {
    const tuple = schema.items.map((item) =>
      renderSchema(item, level + 1, ctx),
    );
    const sep = ctx.mode === "compact" ? "," : ", ";
    return `[${tuple.join(sep)}]`;
  }

  const itemType = renderSchema(schema.items ?? {}, level + 1, ctx);
  return `${parenthesizeIfNeeded(itemType)}[]`;
};

const isArray = (value: unknown): value is any[] | readonly any[] =>
  Array.isArray(value);

const renderByExplicitType = (
  typeName: JsonSchemaTypeName,
  schema: JsonSchema,
  level: number,
  ctx: RenderContext,
): string => {
  switch (typeName) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array":
      return renderArray(schema, level, ctx);
    case "object":
      return renderObject(schema, level, ctx);
    default:
      return "unknown";
  }
};

const renderSchema = (
  schema: JsonSchema,
  level: number,
  ctx: RenderContext,
): string => {
  if (schema.$ref) {
    if (ctx.resolvingRefs.has(schema.$ref)) return "unknown";
    const resolved = resolveRef(schema.$ref, ctx.root);
    if (!resolved) return "unknown";

    ctx.resolvingRefs.add(schema.$ref);
    const out = renderSchema(resolved, level, ctx);
    ctx.resolvingRefs.delete(schema.$ref);
    return out;
  }

  if (schema.const !== undefined)
    return withNullable(literalToTs(schema.const), schema, ctx);

  if (schema.enum && schema.enum.length > 0) {
    const enumTypes = schema.enum.map(literalToTs);
    return withNullable(joinTypes(enumTypes, "|", ctx), schema, ctx);
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const union = joinTypes(
      schema.oneOf.map((s) => renderSchema(s, level, ctx)),
      "|",
      ctx,
    );
    return withNullable(union, schema, ctx);
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    const union = joinTypes(
      schema.anyOf.map((s) => renderSchema(s, level, ctx)),
      "|",
      ctx,
    );
    return withNullable(union, schema, ctx);
  }

  if (schema.allOf && schema.allOf.length > 0) {
    const intersection = joinTypes(
      schema.allOf.map((s) => renderSchema(s, level, ctx)),
      "&",
      ctx,
    );
    return withNullable(intersection, schema, ctx);
  }

  if (Array.isArray(schema.type) && schema.type.length > 0) {
    const mapped = schema.type.map((t) =>
      renderByExplicitType(t, schema, level, ctx),
    );
    return joinTypes(mapped, "|", ctx);
  }

  if (typeof schema.type === "string") {
    const base = renderByExplicitType(schema.type, schema, level, ctx);
    return withNullable(base, schema, ctx);
  }

  // Inference fallback when "type" is omitted
  if (schema.properties || schema.additionalProperties !== undefined) {
    return withNullable(renderObject(schema, level, ctx), schema, ctx);
  }

  if (schema.items) {
    return withNullable(renderArray(schema, level, ctx), schema, ctx);
  }

  return withNullable("unknown", schema, ctx);
};
