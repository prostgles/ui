import React, { useState } from "react";
import type { PrglState } from "../../../App";
import { FlexCol } from "../../../components/Flex";
import { getActiveTokensFilter } from "../../../pages/Sessions";
import { APIDetailsHttp } from "./APIDetailsHttp";
import { APIDetailsTokens } from "./APIDetailsTokens";
import { APIDetailsWs } from "./APIDetailsWs";

export type APIDetailsProps = PrglState & { connectionId: string; projectPath: string; };
export const APIDetails = (props: APIDetailsProps) => {
  
  const [newToken, setToken] = useState("");

  const tokens = useAPITokens(props)

  const electronSession = tokens?.find(t => t.user_agent === "electron");
  const token = electronSession?.id ?? newToken;
 
  return <FlexCol className="APIDetails f-1 min-s-0 o-auto gap-2" >
    <APIDetailsWs { ...props } token={token || "YOUR_TOKEN"} />
    <APIDetailsHttp { ...props } token={token || "YOUR_TOKEN"} />
    <APIDetailsTokens { ...props } token={token} setToken={setToken} tokenCount={tokens?.length ?? 0} />
  </FlexCol>
}

export const useAPITokens = ({ dbs, user }: Pick<PrglState, "dbs" | "user"> ) => {
  const { data: tokens } = dbs.sessions.useSubscribe(getActiveTokensFilter("api_token", user?.id));
  return tokens
}
