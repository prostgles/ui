import React, { useMemo, useState } from "react";
import type { Prgl, PrglState } from "../../../App";
import { FlexCol } from "../../../components/Flex";
import { getActiveTokensFilter } from "../../../pages/Account/Sessions";
import { APIDetailsHttp } from "./APIDetailsHttp";
import { APIDetailsTokens } from "./APIDetailsTokens";
import { APIDetailsWs } from "./APIDetailsWs";
import { JSONBSchema } from "../../../components/JSONBSchema/JSONBSchema";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import SmartFormField from "../../SmartForm/SmartFormField/SmartFormField";
import { FormFieldDebounced } from "../../../components/FormField/FormFieldDebounced";

export type APIDetailsProps = PrglState & {
  connection: Prgl["connection"];
  projectPath: string;
};
export const APIDetails = (props: APIDetailsProps) => {
  const [newToken, setToken] = useState("");

  const tokens = useAPITokens(props);

  const electronSession = tokens?.find((t) => t.user_agent === "electron");
  const token = electronSession?.id ?? newToken;
  const { dbsTables } = props;
  const { table, urlPathCol } = useMemo(() => {
    const table = dbsTables.find((t) => t.name === "connections");
    const urlPathCol = table?.columns.find((c) => c.name === "url_path");
    return { table, urlPathCol };
  }, [dbsTables]);
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
            if (typeof v !== "string") return;
            props.dbs.connections.update(
              { id: props.connection.id },
              { url_path: v },
            );
          }}
        />
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
}: Pick<PrglState, "dbs" | "user">) => {
  const { data: tokens } = dbs.sessions.useSubscribe(
    getActiveTokensFilter("api_token", user?.id),
  );
  return tokens;
};
