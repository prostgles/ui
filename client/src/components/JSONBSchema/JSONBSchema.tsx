import type { JSONB } from "prostgles-types";
import { isEqual, isObject } from "prostgles-types";
import React, { useCallback, useEffect, useState } from "react";
import type { Prgl } from "../../App";
import { isCompleteJSONB } from "./isCompleteJSONB";
import {
  JSONBSchemaAllowedOptions,
  JSONBSchemaAllowedOptionsMatch,
} from "./JSONBSchemaAllowedOptions";
import { JSONBSchemaArray, JSONBSchemaArrayMatch } from "./JSONBSchemaArray";
import { JSONBSchemaLookup, JSONBSchemaLookupMatch } from "./JSONBSchemaLookup";
import { JSONBSchemaObject, JSONBSchemaObjectMatch } from "./JSONBSchemaObject";
import {
  JSONBSchemaOneOfType,
  JSONBSchemaOneOfTypeMatch,
} from "./JSONBSchemaOneOfType";
import {
  JSONBSchemaPrimitive,
  JSONBSchemaPrimitiveMatch,
} from "./JSONBSchemaPrimitive";
import { JSONBSchemaRecord, JSONBSchemaRecordMatch } from "./JSONBSchemaRecord";

type Schema = JSONB.JSONBSchema & { optional?: boolean };
export type JSONBSchemaCommonProps = Pick<Prgl, "db" | "tables"> & {
  className?: string;
  style?: React.CSSProperties;
  value: unknown | undefined;
  setHasErrors?: (hasErrors: boolean) => void;
  showErrors?: boolean;
  nestingPath?: (string | number)[];
  allowIncomplete?: boolean;
  noLabels?: boolean;
  schemaStyles?: {
    path: string[];
    style?: React.CSSProperties;
    className?: string;
  }[];
};

type P<S extends Schema> = JSONBSchemaCommonProps & {
  schema: S;
  onChange: (newValue: JSONB.GetType<S>) => void;
};

export const JSONBSchema = <S extends Schema>(props: P<S>) => {
  const {
    style,
    className = "",
    value,
    schema,
    onChange,
    setHasErrors,
    ...otherProps
  } = props;
  const { allowIncomplete, nestingPath: isNested } = otherProps;
  const [_localValueRaw, setlocalValue] = useState<any>();
  const localValueRaw = _localValueRaw ?? value;
  const localValue = isNested ? value : localValueRaw;
  const setLocalValue = useCallback(
    (newlocalValue) => {
      if (isNested) {
        onChange(newlocalValue);
      } else {
        setlocalValue(newlocalValue);
      }
    },
    [onChange, isNested, setlocalValue],
  );

  const hasError = !isCompleteJSONB(value, schema);
  useEffect(() => {
    setHasErrors?.(hasError);
  }, [hasError, setHasErrors]);

  useEffect(() => {
    if (isNested) return;

    /** Fire onchange if data is complete */
    const shouldFireOnChange =
      allowIncomplete || isCompleteJSONB(localValue, schema);
    const valueHasChanged = !isEqual(localValue, value);
    // console.log({ shouldFireOnChange, valueHasChanged, localValue, value });
    if (shouldFireOnChange && valueHasChanged) {
      onChange(localValue);
      setlocalValue(undefined);
    }
  }, [localValue, value, allowIncomplete, isNested, onChange, schema]);

  if (JSONBSchemaLookupMatch(schema)) {
    return (
      <JSONBSchemaLookup
        value={localValue}
        schema={schema}
        onChange={setLocalValue}
        {...otherProps}
      />
    );
  }

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
  }

  if (node) {
    const isDisabled =
      isObject(schema) && schema.optional && localValue === undefined;
    const styleDisabled =
      !isDisabled || otherProps.nestingPath ? {} : { opacity: 0.5 };
    return (
      <div
        style={{ ...style, ...styleDisabled }}
        className={`JSONBSchema h-fit flex-row ${className}`}
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

// @ts-ignore
export const JSONBSchemaA = JSONBSchema as (
  props: JSONBSchemaCommonProps & {
    schema: any;
    onChange: (newValue: any) => void;
  },
) => React.JSX.Element;
