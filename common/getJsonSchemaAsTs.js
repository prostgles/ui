/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/no-use-before-define */
const DEFAULT_OPTIONS = {
    mode: "full",
    indent: "  ",
};
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const isRecord = (value) => typeof value === "object" && value !== null;
const isValidIdentifier = (name) => IDENTIFIER_RE.test(name);
const formatPropertyName = (name) => isValidIdentifier(name) ? name : JSON.stringify(name);
const sanitizeJsDocLine = (line) => line.replace(/\*\//gu, "*\\/");
const createJsDoc = (description, level, ctx) => {
    if (ctx.mode === "compact" || !(description === null || description === void 0 ? void 0 : description.trim()))
        return "";
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
const literalToTs = (value) => {
    if (value === null)
        return "null";
    if (typeof value === "string")
        return JSON.stringify(value);
    if (typeof value === "number")
        return Number.isFinite(value) ? String(value) : "number";
    if (typeof value === "boolean")
        return value ? "true" : "false";
    return "never";
};
const withNullable = (base, schema, ctx) => {
    const hasNullInTypeArray = Array.isArray(schema.type) && schema.type.includes("null");
    const shouldAddNull = schema.nullable === true && !hasNullInTypeArray && base !== "null";
    if (!shouldAddNull)
        return base;
    return ctx.mode === "compact" ? `${base}|null` : `${base} | null`;
};
const parenthesizeIfNeeded = (type) => type.includes("|") || type.includes("&") ? `(${type})` : type;
const joinTypes = (parts, joiner, ctx) => {
    const clean = [...new Set(parts.filter((p) => p.length > 0))];
    if (clean.length === 0)
        return "unknown";
    if (clean.length === 1)
        return clean[0];
    const sep = ctx.mode === "compact" ? joiner : ` ${joiner} `;
    return clean.join(sep);
};
const resolveRef = (ref, root) => {
    // Supports local refs only: #/$defs/Name or #/definitions/Name
    if (!ref.startsWith("#/"))
        return undefined;
    const path = ref
        .slice(2)
        .split("/")
        .map((seg) => seg.replace(/~1/gu, "/").replace(/~0/gu, "~"));
    let current = root;
    for (const key of path) {
        if (!isRecord(current) || !(key in current))
            return undefined;
        current = current[key];
    }
    return isRecord(current) ? current : undefined;
};
const renderObject = (schema, level, ctx) => {
    var _a, _b;
    const entries = Object.entries((_a = schema.properties) !== null && _a !== void 0 ? _a : {});
    const required = new Set((_b = schema.required) !== null && _b !== void 0 ? _b : []);
    const lines = [];
    for (const [propName, propSchema] of entries) {
        const jsDoc = createJsDoc(propSchema.description, level + 1, ctx);
        const optionalMark = required.has(propName) ? "" : "?";
        const renderedType = renderSchema(propSchema, level + 1, ctx);
        if (ctx.mode === "full") {
            lines.push(`${jsDoc}${ctx.indent.repeat(level + 1)}${formatPropertyName(propName)}${optionalMark}: ${renderedType};`);
        }
        else {
            lines.push(`${formatPropertyName(propName)}${optionalMark}:${renderedType}`);
        }
    }
    if (schema.additionalProperties) {
        let apType = "unknown";
        if (schema.additionalProperties !== true) {
            apType = renderSchema(schema.additionalProperties, level + 1, ctx);
        }
        if (ctx.mode === "full") {
            lines.push(`${ctx.indent.repeat(level + 1)}[key: string]: ${apType};`);
        }
        else {
            lines.push(`[key:string]:${apType}`);
        }
    }
    if (ctx.mode === "compact") {
        return `{${lines.join(";")}}`;
    }
    if (lines.length === 0)
        return "{}";
    return `{\n${lines.join("\n")}\n${ctx.indent.repeat(level)}}`;
};
const renderArray = (schema, level, ctx) => {
    var _a;
    if (isArray(schema.items)) {
        const tuple = schema.items.map((item) => renderSchema(item, level + 1, ctx));
        const sep = ctx.mode === "compact" ? "," : ", ";
        return `[${tuple.join(sep)}]`;
    }
    const itemType = renderSchema((_a = schema.items) !== null && _a !== void 0 ? _a : {}, level + 1, ctx);
    return `${parenthesizeIfNeeded(itemType)}[]`;
};
const isArray = (value) => Array.isArray(value);
const renderByExplicitType = (typeName, schema, level, ctx) => {
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
const renderSchema = (schema, level, ctx) => {
    if (schema.$ref) {
        if (ctx.resolvingRefs.has(schema.$ref))
            return "unknown";
        const resolved = resolveRef(schema.$ref, ctx.root);
        if (!resolved)
            return "unknown";
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
        const union = joinTypes(schema.oneOf.map((s) => renderSchema(s, level, ctx)), "|", ctx);
        return withNullable(union, schema, ctx);
    }
    if (schema.anyOf && schema.anyOf.length > 0) {
        const union = joinTypes(schema.anyOf.map((s) => renderSchema(s, level, ctx)), "|", ctx);
        return withNullable(union, schema, ctx);
    }
    if (schema.allOf && schema.allOf.length > 0) {
        const intersection = joinTypes(schema.allOf.map((s) => renderSchema(s, level, ctx)), "&", ctx);
        return withNullable(intersection, schema, ctx);
    }
    if (Array.isArray(schema.type) && schema.type.length > 0) {
        const mapped = schema.type.map((t) => renderByExplicitType(t, schema, level, ctx));
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
/**
 * Converts a JSON Schema object to a TypeScript type string (no "type X =" wrapper).
 *
 * Full mode  (default): multi-line, indentation, JSDoc comments from descriptions.
 * Compact mode: single-line, no comments.
 */
export const getJsonSchemaAsTs = (schema, options = {}) => {
    var _a, _b;
    const ctx = {
        mode: (_a = options.mode) !== null && _a !== void 0 ? _a : DEFAULT_OPTIONS.mode,
        indent: (_b = options.indent) !== null && _b !== void 0 ? _b : DEFAULT_OPTIONS.indent,
        root: schema,
        resolvingRefs: new Set(),
    };
    return renderSchema(schema, 0, ctx);
};
