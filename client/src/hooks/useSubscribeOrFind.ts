import { useSubscribe } from "prostgles-client";
import type {
  DBSchema,
  SelectReturnType,
  SubscribeParams,
  TableHandler,
} from "prostgles-types";
import { useMemo } from "react";

export const useSubscribeOrFind = <
  Schema extends DBSchema,
  TableName extends keyof Schema,
  const Options extends SubscribeParams<Schema[TableName]["columns"], Schema>,
>(
  tableHandler: Partial<TableHandler<Schema, TableName>> | undefined,
  filter: Parameters<TableHandler<Schema, TableName>["find"]>[0],
  options: Options,
  hookOptions?: Parameters<typeof useSubscribe>[4],
): {
  data:
    | SelectReturnType<Schema, Options, Schema[TableName]["columns"], true>
    | undefined;
  error: unknown;
  isLoading: boolean;
} => {
  const subscribe = tableHandler?.subscribe;
  const find = tableHandler?.find;
  const subscribeOrFind = useMemo<Parameters<typeof useSubscribe>[0]>(
    () =>
      subscribe ??
      (async (filter, options, onData) => {
        if (!find) {
          throw new Error(
            "Table is unavailable or does not support subscribe or find",
          );
        }
        onData(await find(filter, options));
        return { filter, unsubscribe: async () => {} };
      }),
    [subscribe, find],
  );

  const { data, error, isLoading } = useSubscribe(
    subscribeOrFind,
    false,
    filter,
    options,
    hookOptions,
  );
  return { data, error, isLoading };
};
