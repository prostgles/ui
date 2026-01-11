import React, { useMemo, useState } from "react";
import type { Prgl, AppContextProps } from "../../../App";
import { FlexCol } from "@components/Flex";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { getActiveTokensFilter } from "../../../pages/Account/Sessions";
import { APIDetailsHttp } from "./APIDetailsHttp";
import { APIDetailsTokens } from "./APIDetailsTokens";
import { APIDetailsWs } from "./APIDetailsWs";
import { AllowedOriginCheck } from "./AllowedOriginCheck";
import { ELECTRON_USER_AGENT } from "@common/OAuthUtils";
import { useOnErrorAlert } from "@components/AlertProvider";
import type { DBS } from "src/dashboard/Dashboard/DBS";

export type APIDetailsProps = AppContextProps & {
  connection: Prgl["connection"];
  projectPath: string;
};
export const APIDetails = (props: APIDetailsProps) => {
  const [newToken, setToken] = useState("");

  const tokens = useAPITokens(props);

  const electronSession = tokens?.find(
    (t) => t.user_agent === ELECTRON_USER_AGENT,
  );
  const token = electronSession?.id ?? newToken;
  const { dbsTables, dbs, connection } = props;
  const { table, urlPathCol } = useMemo(() => {
    const table = dbsTables.find((t) => t.name === "connections");
    const urlPathCol = table?.columns.find((c) => c.name === "url_path");
    return { table, urlPathCol };
  }, [dbsTables]);
  const { onErrorAlert } = useOnErrorAlert();
  return (
    <FlexCol className="APIDetails f-1 min-s-0 o-auto gap-2">
      {table && urlPathCol && (
        <FormFieldDebounced
          id="url_path"
          label={urlPathCol.label}
          hint={urlPathCol.hint}
          value={props.connection.url_path}
          style={{
            padding: "2px",
            maxWidth: "300px",
          }}
          onChange={(v) => {
            void onErrorAlert(async () => {
              if (typeof v !== "string") return;
              await dbs.connections.update(
                { id: props.connection.id },
                { url_path: v },
              );
            });
          }}
        />
      )}

      {!!(dbs as Partial<DBS>).database_configs && (
        <AllowedOriginCheck dbs={dbs} connection={connection} />
      )}
      <APIDetailsWs {...props} token={token} />
      <APIDetailsHttp {...props} token={token} />
      <APIDetailsTokens
        {...props}
        token={token}
        setToken={setToken}
        tokenCount={tokens?.length ?? 0}
      />
    </FlexCol>
  );
};

export const useAPITokens = ({
  dbs,
  user,
}: Pick<AppContextProps, "dbs" | "user">) => {
  const { data: tokens } = dbs.sessions.useSubscribe(
    getActiveTokensFilter("api_token", user?.id),
  );
  return tokens;
};
