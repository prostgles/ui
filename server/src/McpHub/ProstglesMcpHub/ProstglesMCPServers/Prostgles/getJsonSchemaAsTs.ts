/* json-schema-to-ts.ts */

type JSONSchema =
  | boolean
  | {
      $id?: string;
      $ref?: string;
      $defs?: Record<string, JSONSchema>;
      definitions?: Record<string, JSONSchema>;
      title?: string;
      description?: string;

      // Core typing
      type?: string | string[];
      enum?: unknown[];
      const?: unknown;
      nullable?: boolean;

      // Combinators
      allOf?: JSONSchema[];
      anyOf?: JSONSchema[];
      oneOf?: JSONSchema[];
      not?: JSONSchema;

      // Object
      properties?: Record<string, JSONSchema>;
      required?: string[];
      additionalProperties?: JSONSchema;
      patternProperties?: Record<string, JSONSchema>;

      // Array
      items?: JSONSchema;
      prefixItems?: JSONSchema[];
      minItems?: number;
      maxItems?: number;

      // Other keywords (ignored by generator but allowed)
      [k: string]: unknown;
    };

export interface ConvertOptions {
  rootTypeName?: string;
  exportTypes?: boolean;
}

/**
 * Robust JSON Schema -> TypeScript converter.
 * - Supports local refs (#/...) including recursive refs
 * - Supports $defs and definitions
 * - Handles allOf/anyOf/oneOf
 * - Handles object properties, required, additionalProperties, patternProperties
 * - Handles tuple arrays (prefixItems) and regular arrays (items)
 * - Handles enum / const / nullable / union type arrays (e.g. ["string","null"])
 *
 * Limitations:
 * - External refs (http://..., file://...) are not resolved
 * - Advanced semantics like if/then/else, dependentSchemas, unevaluatedProperties are not modeled
 */
export class JsonSchemaToTypescript {
  private rootSchema: JSONSchema;
  private rootTypeName: string;
  private exportTypes: boolean;

  private pointerToName = new Map<string, string>();
  private emitted = new Map<string, string>();
  private emitting = new Set<string>();
  private usedNames = new Set<string>();

  constructor(schema: JSONSchema, options: ConvertOptions = {}) {
    this.rootSchema = schema;
    this.rootTypeName = this.toTypeName(options.rootTypeName ?? "Root");
    this.exportTypes = options.exportTypes ?? true;

    this.pointerToName.set("#", this.rootTypeName);
    this.usedNames.add(this.rootTypeName);

    // Pre-register names for $defs / definitions for better readability
    this.collectDefinitionPointers(this.rootSchema, "#");
  }

  public convert(): string {
    // Emit all known definitions first
    for (const [pointer, name] of this.pointerToName.entries()) {
      if (pointer === "#") continue;
      this.emitNamed(pointer, name);
    }

    // Emit root type last
    this.emitNamed("#", this.rootTypeName);

    const lines: string[] = [];
    for (const [name, body] of this.emitted.entries()) {
      const kw = this.exportTypes ? "export type" : "type";
      lines.push(`${kw} ${name} = ${body};`);
    }
    return lines.join("\n\n");
  }

  // -----------------------------
  // Core conversion
  // -----------------------------

  private schemaToTs(schema: JSONSchema, pointerHint = "#"): string {
    if (typeof schema === "boolean") return schema ? "unknown" : "never";

    if (schema.$ref) {
      return this.refToTs(schema.$ref);
    }

    // const / enum have highest specificity
    if ("const" in schema) {
      return this.literalToTs(schema.const);
    }
    if (schema.enum && schema.enum.length > 0) {
      return this.union(schema.enum.map((v) => this.literalToTs(v)));
    }

    // Build intersection of direct + combinators
    const parts: string[] = [];

    const direct = this.directTypeToTs(schema, pointerHint);
    if (direct) parts.push(direct);

    if (schema.allOf?.length) {
      parts.push(
        this.intersection(
          schema.allOf.map((s, i) =>
            this.schemaToTs(s, `${pointerHint}/allOf/${i}`),
          ),
        ),
      );
    }
    if (schema.anyOf?.length) {
      parts.push(
        this.union(
          schema.anyOf.map((s, i) =>
            this.schemaToTs(s, `${pointerHint}/anyOf/${i}`),
          ),
        ),
      );
    }
    if (schema.oneOf?.length) {
      parts.push(
        this.union(
          schema.oneOf.map((s, i) =>
            this.schemaToTs(s, `${pointerHint}/oneOf/${i}`),
          ),
        ),
      );
    }

    let result = parts.length ? this.intersection(parts) : "unknown";

    // nullable (OpenAPI-style)
    if (schema.nullable) {
      result = this.union([result, "null"]);
    }

    return result;
  }

  private directTypeToTs(
    schema: Exclude<JSONSchema, boolean>,
    pointerHint: string,
  ): string | null {
    const t = schema.type;

    if (Array.isArray(t) && t.length > 0) {
      const types = t.map((single) =>
        this.singleTypeToTs(single, schema, pointerHint),
      );
      return this.union(types);
    }

    if (typeof t === "string") {
      return this.singleTypeToTs(t, schema, pointerHint);
    }

    // Infer type if `type` is missing but structural keywords exist
    if (
      schema.properties ||
      schema.additionalProperties !== undefined ||
      schema.patternProperties
    ) {
      return this.objectTypeToTs(schema, pointerHint);
    }
    if (schema.items !== undefined || schema.prefixItems) {
      return this.arrayTypeToTs(schema, pointerHint);
    }

    return null;
  }

  private singleTypeToTs(
    type: string,
    schema: Exclude<JSONSchema, boolean>,
    pointerHint: string,
  ): string {
    switch (type) {
      case "null":
        return "null";
      case "boolean":
        return "boolean";
      case "string":
        return "string";
      case "number":
      case "integer":
        return "number";
      case "object":
        return this.objectTypeToTs(schema, pointerHint);
      case "array":
        return this.arrayTypeToTs(schema, pointerHint);
      default:
        return "unknown";
    }
  }

  private objectTypeToTs(
    schema: Exclude<JSONSchema, boolean>,
    pointerHint: string,
  ): string {
    const props = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const patternProps = schema.patternProperties ?? {};

    const members: string[] = [];

    // Named properties
    for (const [key, propSchema] of Object.entries(props)) {
      const optional = required.has(key) ? "" : "?";
      const propName = this.safePropertyKey(key);
      const propType = this.schemaToTs(
        propSchema,
        `${pointerHint}/properties/${this.escapePointerToken(key)}`,
      );
      members.push(`${propName}${optional}: ${propType};`);
    }

    // Index signature from patternProperties + additionalProperties
    const indexTypes: string[] = [];

    for (const [pat, patSchema] of Object.entries(patternProps)) {
      // TS cannot model regex key constraints natively; we merge into string index
      const t = this.schemaToTs(
        patSchema,
        `${pointerHint}/patternProperties/${this.escapePointerToken(pat)}`,
      );
      indexTypes.push(t);
    }

    if (schema.additionalProperties === true) {
      indexTypes.push("unknown");
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      indexTypes.push(
        this.schemaToTs(
          schema.additionalProperties,
          `${pointerHint}/additionalProperties`,
        ),
      );
    }

    if (indexTypes.length > 0) {
      members.push(`[key: string]: ${this.union(indexTypes)};`);
    }

    if (members.length === 0) {
      if (schema.additionalProperties === false) return "Record<string, never>";
      return "Record<string, unknown>";
    }

    return `{\n${members.map((m) => `  ${m}`).join("\n")}\n}`;
  }

  private arrayTypeToTs(
    schema: Exclude<JSONSchema, boolean>,
    pointerHint: string,
  ): string {
    // Tuple style (draft 2020-12)
    if (schema.prefixItems && Array.isArray(schema.prefixItems)) {
      const tupleParts = schema.prefixItems.map((s, i) =>
        this.schemaToTs(s, `${pointerHint}/prefixItems/${i}`),
      );

      const items = schema.items;
      if (items === false) {
        return `[${tupleParts.join(", ")}]`;
      }
      if (items === undefined || items === true) {
        return `[${tupleParts.join(", ")}${tupleParts.length ? ", " : ""}...unknown[]]`;
      }
      return `[${tupleParts.join(", ")}${tupleParts.length ? ", " : ""}...${this.parenthesize(
        this.schemaToTs(items, `${pointerHint}/items`),
      )}[]]`;
    }

    // Regular array
    const items = schema.items;
    if (items === false) return "never[]";
    if (items === undefined || items === true) return "unknown[]";
    return `${this.parenthesize(this.schemaToTs(items, `${pointerHint}/items`))}[]`;
  }

  // -----------------------------
  // Ref handling
  // -----------------------------

  private refToTs(ref: string): string {
    if (!ref.startsWith("#")) {
      throw new Error(`External $ref not supported in this converter: ${ref}`);
    }

    const pointer = ref === "#" ? "#" : ref;
    let name = this.pointerToName.get(pointer);

    if (!name) {
      const suggested = this.pointerToSuggestedName(pointer);
      name = this.uniqueTypeName(suggested);
      this.pointerToName.set(pointer, name);
    }

    this.emitNamed(pointer, name);
    return name;
  }

  private emitNamed(pointer: string, name: string): void {
    if (this.emitted.has(name)) return;
    if (this.emitting.has(name)) return; // recursion guard

    const schema = this.resolvePointer(pointer);
    if (schema === undefined) {
      throw new Error(`Unresolvable JSON Pointer: ${pointer}`);
    }

    this.emitting.add(name);
    const body = this.schemaToTs(schema, pointer);
    this.emitting.delete(name);

    this.emitted.set(name, body);
  }

  private resolvePointer(pointer: string): JSONSchema | undefined {
    if (pointer === "#") return this.rootSchema;
    if (!pointer.startsWith("#/")) return undefined;

    const tokens = pointer
      .slice(2)
      .split("/")
      .map((t) => this.unescapePointerToken(t));

    let cur: any = this.rootSchema;
    for (const token of tokens) {
      if (cur && typeof cur === "object" && token in cur) {
        cur = cur[token];
      } else {
        return undefined;
      }
    }
    return cur as JSONSchema;
  }

  private collectDefinitionPointers(schema: JSONSchema, pointer: string): void {
    if (!schema || typeof schema !== "object") return;

    const defContainers: Array<"$defs" | "definitions"> = [
      "$defs",
      "definitions",
    ];
    for (const container of defContainers) {
      const defs = schema[container];
      if (defs && typeof defs === "object") {
        for (const [key, sub] of Object.entries(defs)) {
          const subPointer = `${pointer}/${container}/${this.escapePointerToken(key)}`;
          if (!this.pointerToName.has(subPointer)) {
            const name = this.uniqueTypeName(this.toTypeName(key));
            this.pointerToName.set(subPointer, name);
          }
          this.collectDefinitionPointers(sub, subPointer);
        }
      }
    }
  }

  // -----------------------------
  // Utilities
  // -----------------------------

  private union(parts: string[]): string {
    const cleaned = [...new Set(parts.filter(Boolean))];
    if (cleaned.length === 0) return "never";
    if (cleaned.length === 1) return cleaned[0]!;
    return cleaned.map((p) => this.parenthesizeIfNeeded(p)).join(" | ");
  }

  private intersection(parts: string[]): string {
    const cleaned = [...new Set(parts.filter(Boolean))];
    if (cleaned.length === 0) return "unknown";
    if (cleaned.length === 1) return cleaned[0]!;
    return cleaned.map((p) => this.parenthesizeIfNeeded(p)).join(" & ");
  }

  private parenthesize(t: string): string {
    return this.parenthesizeIfNeeded(t);
  }

  private parenthesizeIfNeeded(t: string): string {
    // Keep object literals and tuples as-is
    if (
      t.startsWith("{") ||
      t.startsWith("[") ||
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(t)
    )
      return t;
    if (t.includes("|") || t.includes("&") || t.includes("=>")) return `(${t})`;
    return t;
  }

  private safePropertyKey(key: string): string {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
  }

  private literalToTs(value: unknown): string {
    if (value === null) return "null";
    switch (typeof value) {
      case "string":
        return JSON.stringify(value);
      case "number":
        return Number.isFinite(value) ? String(value) : "number";
      case "boolean":
        return value ? "true" : "false";
      default:
        // Objects/arrays as const literals are possible in JSON Schema;
        // TS literal typing for deep objects is complex—fallback safely:
        return "unknown";
    }
  }

  private toTypeName(raw: string): string {
    const cleaned = raw
      .replace(/[^A-Za-z0-9_$]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("");
    const base = cleaned || "Type";
    return /^[A-Za-z_$]/.test(base) ? base : `T${base}`;
  }

  private uniqueTypeName(base: string): string {
    let name = base || "Type";
    let i = 2;
    while (this.usedNames.has(name)) {
      name = `${base}${i++}`;
    }
    this.usedNames.add(name);
    return name;
  }

  private pointerToSuggestedName(pointer: string): string {
    if (pointer === "#") return this.rootTypeName;
    const parts = pointer.split("/");
    const tail = parts[parts.length - 1] || "Type";
    return this.toTypeName(this.unescapePointerToken(tail));
    // ex: "#/$defs/user-profile" -> "UserProfile"
  }

  private escapePointerToken(token: string): string {
    return token.replace(/~/g, "~0").replace(/\//g, "~1");
  }

  private unescapePointerToken(token: string): string {
    return token.replace(/~1/g, "/").replace(/~0/g, "~");
  }
}

// ---------- convenience function ----------
export function convertJsonSchemaToTypes(
  schema: JSONSchema,
  options: ConvertOptions = {},
): string {
  return new JsonSchemaToTypescript(schema, options).convert();
}
