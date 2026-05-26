import { getJSONBSchemaValidationError, type JSONB } from "prostgles-types";
import { useMemo } from "react";
export const useJSONBParsedData = <S extends JSONB.FieldType>(
  rawData: unknown,
  schema: S,
):
  | { error: string; data?: undefined }
  | { error?: undefined; data: JSONB.GetType<S> } => {
  const resultObj = useMemo(() => {
    return getJSONBSchemaValidationError(schema, rawData, {
      allowExtraProperties: true,
    });
  }, [schema, rawData]);

  return resultObj;
};
