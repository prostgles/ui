import { isObject } from "prostgles-types";

export const mergeTableMetadata = (
  existing: unknown,
  updates: unknown,
): unknown => {
  if (!isObject(existing) || !isObject(updates)) return updates;

  return {
    ...existing,
    ...Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [
        key,
        mergeTableMetadata(
          Object.hasOwn(existing, key) ? existing[key] : undefined,
          value,
        ),
      ]),
    ),
  };
};
