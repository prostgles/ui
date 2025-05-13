import type { ValidatedColumnInfo } from "prostgles-types";
import type { FieldConfig } from "./SmartCard";

export const getSelectForFieldConfigs = (
  fieldConfigs?: FieldConfig<any>[],
  columns?: ValidatedColumnInfo[],
) => {
  if (!fieldConfigs) return "*";
  const result = fieldConfigs
    .filter((fieldConfig) => {
      if (columns) {
        if (
          columns.some((c) =>
            typeof fieldConfig === "string" ?
              c.name === fieldConfig
            : fieldConfig.select || fieldConfig.name === c.name,
          )
        ) {
          return true;
        }
        console.warn("Bad/invalid column name provided: ", fieldConfig);
        return false;
      }
      return true;
    })
    .reduce(
      (a, v) => ({
        ...a,
        [typeof v === "string" ? v : v.name]:
          typeof v === "string" || !v.select ? 1 : v.select,
      }),
      {},
    );

  const pKeyCols = columns?.filter((c) => c.is_pkey);
  if (pKeyCols?.length) {
    return {
      ...Object.fromEntries(pKeyCols.map(({ name }) => [name, 1])),
      ...result,
    };
  }

  return result;
};
