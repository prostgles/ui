import { mdiClose, mdiDotsHorizontal } from "@mdi/js";
import type { JSONB } from "prostgles-types";
import { getKeys, isObject, omitKeys } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../Btn";
import { Label } from "../Label";
import type { JSONBSchemaCommonProps } from "./JSONBSchema";
import { JSONBSchema } from "./JSONBSchema";
import { getSchemaFromField } from "./isCompleteJSONB";

type Schema = JSONB.ObjectType;
type P = JSONBSchemaCommonProps & {
  schema: Schema;
  onChange: (newValue: JSONB.GetType<Schema>) => void;
  showOptionalUndefinedProps?: boolean;
};

export const JSONBSchemaObjectMatch = (
  s: JSONB.JSONBSchema,
): s is JSONB.ObjectType => isObject(s.type);
export const JSONBSchemaObject = ({
  value: rawValue,
  schema,
  onChange,
  isNested = false,
  ...oProps
}: P) => {
  const value = isObject(rawValue) ? rawValue : undefined;
  const optionalProps = Object.entries(schema.type)
    .filter(([k, v]) => isObject(v) && v.optional && value?.[k] === undefined)
    .map(([k]) => k);
  const [showOptional, setShowOptional] = useState(false);

  if (schema.optional && value === undefined && !showOptional && isNested) {
    return (
      <div
        className={
          "JSONBSchemaObject flex-col gap-p5 as-end " + (oProps.className ?? "")
        }
        style={oProps.style}
      >
        <Label variant="normal">{schema.title}</Label>
        <Btn
          iconPath={mdiDotsHorizontal}
          variant="faded"
          onClick={() => {
            setShowOptional(true);
            onChange({} as any);
          }}
        />
      </div>
    );
  }

  const objectSchema = schema.type;
  const requiredPropNames = getKeys(objectSchema).filter(
    (k) => !getSchemaFromField(objectSchema[k]!).optional,
  );
  const optionalPropNames = getKeys(objectSchema).filter(
    (k) => getSchemaFromField(objectSchema[k]!).optional,
  );

  return (
    <div
      className={
        "JSONBSchemaObject flex-row-wrap gap-1 " + (oProps.className ?? "")
      }
      style={oProps.style}
    >
      {[...requiredPropNames, ...optionalPropNames]
        .filter((k) => showOptional || !optionalProps.includes(k))
        .map((propName) => {
          const ps = schema.type[propName]!;
          const propSchema = {
            title: propName,
            ...(typeof ps === "string" ? { type: ps } : ps),
          };
          return (
            <div key={propName} className="flex-row gap-1">
              <JSONBSchema
                value={(value as any)?.[propName] as any}
                schema={propSchema as any}
                isNested={true}
                onChange={
                  ((newVal) => {
                    onChange(
                      (newVal === undefined ?
                        omitKeys(value ?? {}, [propName])
                      : { ...value, [propName]: newVal }) as any,
                    );
                  }) as any
                }
                {...oProps}
              />
            </div>
          );
        })}
      {!showOptional && !!optionalProps.length && (
        <Btn
          title="Show more"
          iconPath={mdiDotsHorizontal}
          onClick={() => setShowOptional(true)}
          className="as-end fit"
        />
      )}
      {value !== undefined && schema.optional && (
        <Btn
          title="Remove"
          iconPath={mdiClose}
          onClick={() => onChange(undefined as any)}
          className="as-end fit"
        />
      )}
    </div>
  );
};
