import type { ValidatedColumnInfo } from "prostgles-types";
import {
  _PG_bool,
  _PG_date,
  _PG_geometric,
  _PG_interval,
  _PG_json,
  _PG_numbers,
  _PG_postgis,
  _PG_strings,
  isObject,
  TS_PG_Types,
} from "prostgles-types";
import type { FilterColumn } from "../../SmartFilter/smartFilterUtils";
import { getPGIntervalAsText } from "../../W_SQL/customRenderers";

/**
 * Used in transforming a postgres/db value to a valid html <input /> OR <CodeEditor /> value
 */
export const parseValue = (
  c: ValidatedColumnInfo | FilterColumn,
  value: any,
  reverseForServer = false,
) => {
  if (reverseForServer) {
    if (
      (c.udt_name === "geography" || c.udt_name === "geometry") &&
      typeof value === "string" &&
      value.trim().startsWith("{")
    ) {
      try {
        return JSON.parse(value);
      } catch (e) {}
    }

    return value;
  }

  /** CodeEditor accepts only string */
  if (c.udt_name.startsWith("json")) {
    if (!value) return "";
    return JSON.stringify(value, null, 2);
  }

  if (value) {
    if (c.udt_name === "interval" && typeof value !== "string") {
      return getPGIntervalAsText(value);
    }

    const parseDateStr = (v: string | number, withTimeZone = false) => {
      const wTz = new Date(v).toISOString();
      if (!withTimeZone) return wTz.slice(0, -5);

      /** datetime-local does not support timezone so we're slicing it out anyway */
      return wTz.slice(0, 19);
    };

    if (c.udt_name.startsWith("geo")) {
      if (typeof value === "string") return value;

      try {
        return JSON.stringify(
          typeof value === "object" ? value : JSON.parse(value as any),
          null,
          2,
        );
      } catch (err) {
        return typeof value === "string" ? value : value + "";
      }
    }

    if (
      c.udt_name.startsWith("geo") &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return JSON.stringify(value);
    }
    const v = typeof value === "string" ? value : +value;
    if (c.udt_name === "date") return new Date(v).toISOString().split("T")[0];
    if (c.udt_name.startsWith("timestamp"))
      return parseDateStr(v, c.udt_name === "timestamptz");
    if (Array.isArray(value) && !value.some((v) => isObject(v))) {
      if (c.udt_name.includes("timestamp")) {
        return value
          .filter((v) => v !== "")
          .map((v) => parseDateStr(v, c.udt_name.endsWith("z")));
      }
    }
  }

  return value;
};

export const parseDefaultValue = (
  c: ValidatedColumnInfo,
  value: any,
  wasChanged: boolean,
) => {
  if (wasChanged) return value;

  /* If value is provided then return it */
  if (![null, undefined].includes(value)) return value;

  /* If value is nullable and null then return it */
  if (c.is_nullable && value === null) return value;

  if (c.has_default && typeof c.column_default === "string") {
    if (c.column_default.endsWith("::text"))
      return c.column_default.slice(1, -7);
    // if (["now()", "CURRENT_TIMESTAMP"].includes(c.column_default)) {
    //   if (c.udt_name === "date") return (new Date()).toISOString().split('T')[0];
    //   return (new Date()).toISOString().slice(0, -5);
    // }
    if (c.udt_name === "jsonb" && c.column_default.endsWith("::jsonb")) {
      try {
        const val = JSON.parse(c.column_default.slice(1, -8));
        return val;
      } catch (e) {
        console.error("Could not parse column_default", e);
      }
    }
    if (c.tsDataType === "number") return Number(c.column_default);
  } else if (value) {
    return parseValue(c, value);
  }

  return value;
};

export const getInputType = (
  c: Pick<ValidatedColumnInfo, "udt_name" | "tsDataType" | "name">,
): string => {
  return (
    c.udt_name === "date" ? "date"
    : c.udt_name.startsWith("timestamp") ? "datetime-local"
    : c.udt_name === "time" ? "time"
    : c.tsDataType === "boolean" ? "checkbox"
    : ["email"].includes(c.name) ? "email"
    : ["phone", "telephone", "phone_number", "tel"].includes(c.name) ? "tel"
    : ["zip_code", "zipcode", "post_code", "postcode"].includes(c.name) ?
      "postal-code"
    : ["given-name", "first_name", "first-name"].includes(c.name) ? "given-name"
    : ["family-name", "last_name", "last-name"].includes(c.name) ? "family-name"
    : ["address_line1", "address_line"].includes(c.name) ? "address-line1"
    : ["address_line2"].includes(c.name) ? "address-line2"
    : c.tsDataType === "string" ? "text"
    : (c.tsDataType as string)
  );
};

export const getInputAutocomplete = (c: ValidatedColumnInfo): string => {
  const _autocomplete_values = [
    "address-line1",
    "address-line2",
    "address-line3",
    "street_address",
    "street",
    "address",
    "address-level1",
    "address-level2",
    "address-level3",
    "address-level4",
    "organization",
    "organization-title",
    "country",
    "country-name",
    "postal-code",
    "tel",
    "given-name",
    "family-name",
    "email",
  ];
  const autocomplete_values = _autocomplete_values.concat(
    _autocomplete_values.map((v) => v.replaceAll("-", "_")),
  );
  const noAutocomplete = ["date", "timestamp", "timestamptz"].includes(
    c.udt_name,
  );
  return (
    noAutocomplete ? "off"
    : autocomplete_values.includes(c.name.toLowerCase()) ?
      c.name.replaceAll("_", "-").toLowerCase()
    : "on"
  );
};

export const columnIsReadOnly = (
  action: "update" | "insert" | "view" | undefined,
  c: ValidatedColumnInfo,
) => {
  return (
    action === "view" ||
    (action === "update" && !c.update) ||
    (action === "insert" && !c.insert)
  );
};

export const tsDataTypeFromUdtName = (
  udtName: string,
): ValidatedColumnInfo["tsDataType"] => {
  return (
    Object.entries(TS_PG_Types).find(([ts, pgArr]) =>
      (pgArr as any).includes(udtName.toLowerCase()),
    )?.[0] ?? ("string" as any)
  );
};

const PG_Types = {
  _PG_strings,
  _PG_numbers,
  _PG_json,
  _PG_bool,
  _PG_date,
  _PG_interval,
  _PG_postgis,
  _PG_geometric,
} as const;
type PG_T = keyof typeof PG_Types;
export const colIs = (
  c: Partial<Pick<ValidatedColumnInfo, "udt_name">> | undefined,
  type: PG_T | PG_T[],
) => {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => PG_Types[t].some((v) => c?.udt_name === v));
};
