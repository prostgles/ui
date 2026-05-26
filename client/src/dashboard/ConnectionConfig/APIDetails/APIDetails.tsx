import { ELECTRON_USER_AGENT } from "@common/OAuthUtils";
import { useOnErrorAlert } from "@components/AlertProvider";
import { FlexCol } from "@components/Flex";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import React, { useMemo, useState } from "react";
import type { DBS } from "src/dashboard/Dashboard/DBS";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { Prgl } from "../../../App";
import { getActiveTokensFilter } from "../../../pages/Account/Sessions";
import { APIDetailsHttp } from "./APIDetailsHttp";
import { APIDetailsTokens } from "./APIDetailsTokens";
import { APIDetailsWs } from "./APIDetailsWs";
import { AllowedOriginCheck } from "./AllowedOriginCheck";

export type APIDetailsProps = {
  connection: Prgl["connection"];
};
export const APIDetails = ({ connection }: APIDetailsProps) => {
  const [newToken, setToken] = useState("");

  const tokens = useAPITokens();

  const electronSession = tokens?.find(
    (t) => t.user_agent === ELECTRON_USER_AGENT,
  );
  const token = electronSession?.id ?? newToken;
  const { dbsTables, dbs } = usePrglCore();
  const { table, urlPathCol } = useMemo(() => {
    const table = dbsTables.find((t) => t.name === "connections");
    const urlPathCol = table?.columns.find((c) => c.name === "url_path");
    return { table, urlPathCol };
  }, [dbsTables]);

  const { id, is_state_db, port, url_path } = connection;
  const filter = useMemo(
    () => ({
      $existsJoined: {
        connections: !port && !is_state_db ? { is_state_db: true } : { id },
      },
    }),
    [id, is_state_db, port],
  );
  const { data: databaseConfig } = dbs.database_configs.useSubscribeOne(filter);
  const { onErrorAlert } = useOnErrorAlert();
  return (
    <FlexCol className="APIDetails f-1 min-s-0 o-auto gap-2">
      <FormFieldDebounced
        id="port"
        type="integer"
        label={"Port"}
        disabledInfo={
          is_state_db ? "Must be changed from environment variable" : undefined
        }
        value={port || 3004}
        style={{
          padding: "2px",
          maxWidth: "300px",
        }}
        onChange={(newPort) => {
          void onErrorAlert(async () => {
            await dbs.connections.update(
              { id: connection.id },
              { port: newPort },
            );
          });
        }}
      />
      {table && urlPathCol && (
        <FormFieldDebounced
          id="url_path"
          label={urlPathCol.label}
          hint={urlPathCol.hint}
          value={url_path}
          style={{
            padding: "2px",
            maxWidth: "300px",
          }}
          onChange={(v) => {
            void onErrorAlert(async () => {
              if (typeof v !== "string") return;
              await dbs.connections.update(
                { id: connection.id },
                { url_path: v },
              );
            });
          }}
        />
      )}

      {!!(dbs as Partial<DBS>).database_configs && databaseConfig && (
        <AllowedOriginCheck databaseConfig={databaseConfig} />
      )}
      <APIDetailsWs connection={connection} token={token} />
      <APIDetailsHttp connection={connection} token={token} />
      <APIDetailsTokens
        connection={connection}
        token={token}
        setToken={setToken}
        tokenCount={tokens?.length ?? 0}
      />
    </FlexCol>
  );
};

export const useAPITokens = () => {
  const { dbs, user } = usePrglCore();
  const { data: tokens } = dbs.sessions.useSubscribe(
    getActiveTokensFilter("api_token", user?.id),
  );
  return tokens;
};
