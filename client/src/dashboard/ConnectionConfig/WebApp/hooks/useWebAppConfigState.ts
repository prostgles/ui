import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { pickKeys } from "prostgles-types";
import { useMemo, useState } from "react";
import { areEqual, isEmpty } from "src/utils/utils";

export const useWebAppConfigState = () => {
  const { connectionId, dbs, tables } = usePrgl();
  const {
    data: connection,
    isLoading,
    error,
  } = dbs.connections.useSubscribeOne({
    id: connectionId,
  });

  const { web_app_directory, web_app_templated } = connection ?? {};
  const [edits, setEdits] = useState(
    connection &&
      pickKeys(connection as Partial<typeof connection>, [
        "web_app_directory",
        "web_app_templated",
      ]),
  );
  const didChange = useMemo(
    () =>
      connection &&
      edits &&
      !isEmpty(edits) &&
      !areEqual(connection, edits, ["web_app_directory", "web_app_templated"]),
    [connection, edits],
  );

  const usersTableError = useMemo(() => {
    const usersTable = tables.find((t) => t.name === "users");
    if (!usersTable) {
      return 'A "users" is required.';
    }
    const hasType = usersTable.columns.some((c) => c.name === "type");
    if (!hasType) {
      return 'A "type" TEXT column is required on the "users" table.';
    }
  }, [tables]);
  const { data: usedPorts } = dbs.connections.useFind(
    {},
    { select: { port: 1 }, returnType: "values" },
  );

  return {
    connection,
    isLoading,
    error,
    web_app_directory,
    web_app_templated,
    edits,
    setEdits,
    didChange,
    usersTableError,
    usedPorts,
    connectionId,
    dbs,
  };
};
