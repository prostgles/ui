import type { JSONB } from "prostgles-types";
import { getKeys, isObject, omitKeys, pickKeys } from "prostgles-types";
import React from "react";
import type { JSONBSchemaCommonProps } from "./JSONBSchema";
import { JSONBSchemaObject } from "./JSONBSchemaObject";
import { classOverride } from "../Flex";

type Schema = Extract<
  { oneOfType: Required<JSONB.OneOf>["oneOfType"] },
  JSONB.OneOf
>;
type P = JSONBSchemaCommonProps & {
  schema: Schema;
  onChange: (newValue: JSONB.GetType<Schema>) => void;
};

/**
 * Can render oneOfType only if there are common properties across objects
 */
export const JSONBSchemaOneOfTypeMatch = (s: JSONB.JSONBSchema): s is Schema =>
  !!s.oneOfType?.length;

export const JSONBSchemaOneOfType = ({
  value,
  schema,
  onChange,
  nestingPath,
  style,
  className,
  ...oProps
}: P) => {
  const s = schema;

  const firstSchema = s.oneOfType[0];
  const firstSchemaKeys = getKeys(firstSchema ?? {});
  const commonRequiredPropertyNames = firstSchemaKeys.filter((propName) => {
    const fPropS = getFieldObj(firstSchema![propName]!);
    return (
      !fPropS.optional &&
      s.oneOfType.every((subSchema) => {
        const objType = subSchema[propName];
        const propS = typeof objType === "string" ? { type: objType } : objType;
        return (
          propS && (propS.type === fPropS.type || (propS.enum && fPropS.enum))
        );
      })
    );
  });

  /**
   * oneOfType: [
   *  { toggle: { enum: ["opt1"] } },
   *  ...otherProps
   */
  const toggleProps = commonRequiredPropertyNames.filter((key) => {
    const s = firstSchema?.[key];
    return isObject(s) && s.enum?.length;
  });

  if (!firstSchema) {
    return <>Cannot render: schema.oneOfType is empty</>;
  }
  if (!toggleProps.length) {
    return <>Cannot render: schema.oneOfType has no common properties</>;
  }

  const getOneOfSchemaIndex = (value: any): number => {
    return s.oneOfType.findIndex(
      (ss) =>
        isObject(value) &&
        toggleProps.every((propName) =>
          (ss[propName] as JSONB.EnumType).enum.includes(value[propName]),
        ),
    );
  };

  const matchingOneOfSchemaIdx = getOneOfSchemaIndex(value);

  const matchingOneOfSchema = structuredClone(
    s.oneOfType[matchingOneOfSchemaIdx] ||
      pickKeys(firstSchema, commonRequiredPropertyNames),
  );

  toggleProps.forEach((tKey) => {
    /**
     * Create full options schema
     */
    matchingOneOfSchema![tKey] = {
      ...omitKeys(matchingOneOfSchema![tKey]! as any, ["enum"]),
      oneOf: s.oneOfType.flatMap((ss) => {
        return {
          title: tKey,
          ...(ss[tKey] as JSONB.EnumType),
        };
      }),
    };
  });

  const itemNestingPath = [...(nestingPath ?? []), matchingOneOfSchemaIdx];
  const itemStyle = oProps.schemaStyles?.find(
    (ss) => ss.path.join() === itemNestingPath.join(),
  );
  return (
    <div className="JSONBSchemaOneOf flex-row-wrap gap-1">
      <JSONBSchemaObject
        schema={{
          ...omitKeys(s, ["oneOfType"]),
          type: matchingOneOfSchema,
        }}
        value={value as any}
        onChange={(newValue) => {
          /**
           * If matching a different schema then keep only common properties
           */
          const newSchemaIdx = getOneOfSchemaIndex(newValue);
          //@ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (newValue && newSchemaIdx !== matchingOneOfSchemaIdx) {
            const currentSchema = matchingOneOfSchema;
            const newSchema = s.oneOfType[newSchemaIdx]!;
            /** Must remove any properties that do not exist in the new schema */
            const newValueWithCommonProps = pickKeys(
              newValue,
              getKeys(newSchema).filter((key) => {
                if (toggleProps.includes(key)) return true;
                const oldPropSchema =
                  currentSchema[key] && getFieldObj(currentSchema[key]);
                const newPropSchema =
                  newSchema[key] && getFieldObj(newSchema[key]);
                return (
                  oldPropSchema &&
                  newPropSchema &&
                  typeof oldPropSchema.type === "string" &&
                  oldPropSchema.type === newPropSchema.type
                );
              }),
            );
            //@ts-ignore
            onChange(newValueWithCommonProps);
          } else {
            onChange(newValue);
          }
        }}
        nestingPath={itemNestingPath}
        className={classOverride(className, itemStyle?.className)}
        style={{ ...style, ...itemStyle?.style }}
        {...oProps}
      />
    </div>
  );
};

export const getFieldObj = (f: JSONB.FieldType): JSONB.FieldTypeObj => {
  return typeof f === "string" ? { type: f } : f;
};
