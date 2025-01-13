import type { JSONB } from "prostgles-types";
import { isObject } from "prostgles-types";
import React, { useEffect, useState } from "react";
import { areEqual } from "../../utils";
import { isCompleteJSONB } from "./isCompleteJSONB";
import {
  JSONBSchemaAllowedOptions,
  JSONBSchemaAllowedOptionsMatch,
} from "./JSONBSchemaAllowedOptions";
import { JSONBSchemaArray, JSONBSchemaArrayMatch } from "./JSONBSchemaArray";
import { JSONBSchemaLookup, JSONBSchemaLookupMatch } from "./JSONBSchemaLookup";
import { JSONBSchemaObject, JSONBSchemaObjectMatch } from "./JSONBSchemaObject";
import {
  JSONBSchemaOneOfTypeMatch,
  JSONBSchemaOneOfType,
} from "./JSONBSchemaOneOf";
import {
  JSONBSchemaPrimitive,
  JSONBSchemaPrimitiveMatch,
} from "./JSONBSchemaPrimitive";
import { JSONBSchemaRecord, JSONBSchemaRecordMatch } from "./JSONBSchemaRecord";
import type { Prgl } from "../../App";

type Schema = JSONB.JSONBSchema & { optional?: boolean };
export type JSONBSchemaCommonProps = Pick<Prgl, "db" | "tables"> & {
  className?: string;
  style?: React.CSSProperties;
  value: unknown | undefined;
  setHasErrors?: (hasErrors: boolean) => void;
  showErrors?: boolean;
  isNested?: boolean;
  allowIncomplete?: boolean;
};

type P<S extends Schema> = JSONBSchemaCommonProps & {
  schema: S;
  onChange: (newValue: JSONB.GetType<S>) => void;
};
export const JSONBSchema = <S extends Schema>({
  style,
  className = "",
  value,
  schema,
  onChange,
  setHasErrors,
  ...otherProps
}: P<S>) => {
  const [_localValueRaw, setlocalValue] = useState<any>();
  const localValueRaw = _localValueRaw ?? value;
  const localValue = otherProps.isNested ? value : localValueRaw;
  const setLocalValue = (newlocalValue) => {
    if (otherProps.isNested) {
      onChange(newlocalValue);
      return;
    }
    setlocalValue(newlocalValue);
  };

  const hasError = !isCompleteJSONB(value, schema);
  useEffect(() => {
    setHasErrors?.(hasError);
  }, [hasError, setHasErrors]);

  useEffect(() => {
    if (otherProps.isNested) return;
    /** Fire onchange if data is complete */
    const shouldFireOnChange =
      otherProps.allowIncomplete || isCompleteJSONB(localValue, schema);
    const valueHasChanged = !areEqual(localValue ?? {}, value ?? {});
    // console.log({ shouldFireOnChange, valueHasChanged, localValue, value });
    if (shouldFireOnChange && valueHasChanged) {
      onChange(localValue);
    }
  }, [
    localValue,
    value,
    otherProps.allowIncomplete,
    otherProps.isNested,
    onChange,
    schema,
  ]);

  let node: React.ReactNode = null;
  if (JSONBSchemaAllowedOptionsMatch(schema)) {
    node = (
      <JSONBSchemaAllowedOptions
        value={localValue}
        schema={schema}
        onChange={setLocalValue}
        {...otherProps}
      />
    );
  } else if (JSONBSchemaPrimitiveMatch(schema)) {
    node = (
      <JSONBSchemaPrimitive
        value={localValue}
        schema={schema}
        onChange={setLocalValue}
        {...otherProps}
      />
    );
  } else if (JSONBSchemaOneOfTypeMatch(schema)) {
    node = (
      //@ts-ignore
      <JSONBSchemaOneOfType
        value={localValue as any}
        schema={schema as any}
        onChange={setLocalValue}
        {...otherProps}
      />
    );
  } else if (JSONBSchemaObjectMatch(schema)) {
    node = (
      <JSONBSchemaObject
        value={localValue}
        schema={schema}
        onChange={setLocalValue}
        {...otherProps}
      />
    );
  } else if (JSONBSchemaRecordMatch(schema)) {
    node = (
      <JSONBSchemaRecord
        value={localValue}
        schema={schema}
        onChange={setLocalValue}
        {...otherProps}
      />
    );
  } else if (JSONBSchemaArrayMatch(schema)) {
    node = (
      <JSONBSchemaArray
        value={localValue}
        schema={schema}
        onChange={setLocalValue}
        {...otherProps}
      />
    );
  } else if (JSONBSchemaLookupMatch(schema)) {
    return (
      <JSONBSchemaLookup
        value={localValue}
        schema={schema}
        onChange={setLocalValue}
        {...otherProps}
      />
    );
  }

  if (node) {
    const isDisabled =
      isObject(schema) && schema.optional && localValue === undefined;
    const styleDisabled =
      !isDisabled || otherProps.isNested ? {} : { opacity: 0.5 };
    return (
      <div
        style={{ ...style, ...styleDisabled }}
        className={`JSONBSchema flex-row ${className}`}
      >
        {node}
      </div>
    );
  }

  return (
    <>
      Schema not suitable for JSONBSchema.tsx: {JSON.stringify(schema, null, 2)}
    </>
  );
};

export const JSONBSchemaA = (
  p: JSONBSchemaCommonProps & {
    schema: any;
    onChange: (newValue: any) => void;
  },
) => {
  return <JSONBSchema {...(p as any)} />;
};
