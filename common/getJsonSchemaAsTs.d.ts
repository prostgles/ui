type JsonSchemaTypeName = "string" | "number" | "integer" | "boolean" | "null" | "object" | "array";
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
    mode?: RenderMode;
    indent?: string;
};
/**
 * Converts a JSON Schema object to a TypeScript type string (no "type X =" wrapper).
 *
 * Full mode  (default): multi-line, indentation, JSDoc comments from descriptions.
 * Compact mode: single-line, no comments.
 */
export declare const getJsonSchemaAsTs: (schema: JsonSchema, options?: JsonSchemaToTsOptions) => string;
export {};
//# sourceMappingURL=getJsonSchemaAsTs.d.ts.map