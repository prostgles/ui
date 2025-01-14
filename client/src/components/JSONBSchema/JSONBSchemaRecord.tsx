import { mdiPlus } from "@mdi/js";
import type { JSONB } from "prostgles-types";
import { getKeys, isObject, omitKeys } from "prostgles-types";
import React from "react";
import Btn from "../Btn";
import { FormFieldDebounced } from "../FormField/FormFieldDebounced";
import type { JSONBSchemaCommonProps } from "./JSONBSchema";
import { JSONBSchema } from "./JSONBSchema";

type Schema = JSONB.RecordType;
type P = JSONBSchemaCommonProps & {
  schema: Schema;
  onChange: (newValue: JSONB.GetType<Schema>) => void;
};

export const JSONBSchemaRecordMatch = (s: JSONB.JSONBSchema): s is Schema =>
  isObject(s.record);
export const JSONBSchemaRecord = ({
  value,
  schema,
  onChange,
  ...oProps
}: P) => {
  return (
    <div className="JSONBSchemaRecord flex-col gap-1 jc-end">
      {isObject(value) &&
        getKeys(value).map((propName) => {
          const ps = schema.record.values ?? { type: "any" };
          const propSchema = {
            title: propName,
            ...(typeof ps === "string" ? { type: ps } : ps),
          };
          return (
            <div key={propName} className="flex-row gap-1">
              <FormFieldDebounced
                label={"Property name"}
                type="text"
                value={propName}
                onChange={(newPropName) => {
                  onChange({
                    ...omitKeys(value, [propName]),
                    [newPropName]: value[propName],
                  });
                }}
              />
              <JSONBSchema
                value={value[propName]}
                schema={propSchema}
                //@ts-ignore
                onChange={(newVal) => {
                  onChange(
                    newVal === undefined ?
                      omitKeys(value, [propName])
                    : { ...value, [propName]: newVal },
                  );
                }}
                {...oProps}
              />
            </div>
          );
        })}

      <Btn
        iconPath={mdiPlus}
        variant="filled"
        color="action"
        onClick={() => {
          onChange({
            ...(value ?? {}),
            new_property: {},
          });
        }}
      >
        Add property
      </Btn>
    </div>
  );
};
