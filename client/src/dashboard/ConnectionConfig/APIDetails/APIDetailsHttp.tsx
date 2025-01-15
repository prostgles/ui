import { mdiCodeBraces } from "@mdi/js";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexCol } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import { SwitchToggle } from "../../../components/SwitchToggle";
import CodeExample from "../../CodeExample";
import type { APIDetailsProps } from "./APIDetails";
import { getConnectionPaths } from "../../../../../commonTypes/utils";
import { t } from "../../../i18n/i18nUtils";

export const APIDetailsHttp = ({
  dbs,
  connection,
  token,
}: APIDetailsProps & { token?: string }) => {
  const { data: dbConfig } = dbs.database_configs.useSubscribeOne({
    $existsJoined: { connections: { id: connection.id } },
  });
  const restPath = `${window.location.origin}${getConnectionPaths(connection).rest}`;

  return (
    <FlexCol>
      <h4 className="m-0 p-0">HTTP API</h4>
      {dbConfig && (
        <FlexCol className=" ">
          <SwitchToggle
            label={t.common.Enabled}
            variant="row"
            checked={!!dbConfig.rest_api_enabled}
            onChange={(rest_api_enabled) => {
              dbs.database_configs.update(
                { id: dbConfig.id },
                { rest_api_enabled },
              );
            }}
          />
          <div>
            {
              t.APIDetailsHttp[
                "Provides similar level of access to the Websocket API with the following limitations: no subscriptions, no sync, no file upload"
              ]
            }
          </div>
          {dbConfig.rest_api_enabled && (
            <PopupMenu
              title={t.APIDetailsWs.Examples}
              button={
                <Btn variant="filled" iconPath={mdiCodeBraces} color="action">
                  {t.APIDetailsWs.Examples}
                </Btn>
              }
              onClickClose={false}
              positioning="center"
              contentStyle={{
                width: "700px",
                height: "500px",
                maxWidth: "100%",
              }}
              clickCatchStyle={{ opacity: 0.6 }}
              content={
                <CodeExample
                  language="javascript"
                  style={{ minHeight: "400px" }}
                  value={getRestExample(restPath, token)}
                />
              }
            />
          )}
        </FlexCol>
      )}
    </FlexCol>
  );
};

const getRestExample = (path: string, token?: string) => `
const headers = new Headers({
  'Authorization': \`Bearer ${!token ? "YOUR_TOKEN_IN_BASE64" : btoa(token)}\`, 
  'Accept': 'application/json',
  'Content-Type': 'application/json'
})
const api = (route, ...params) => fetch(
  \`${path}/\${route.join("/")}\`, 
  { 
    method: "POST", 
    headers,
    body: JSON.stringify(params ?? [])
  })
  .then(res => res.json())
  .catch(res => res.text())
  .catch(res => res.statusText) 
  
const schema = await api(["schema"]);
console.log(schema);
const data = await api(["db", schema.tableSchema[0]?.name ?? "someTable", "find"], {}, { select: "*", limit: 2 })
// const methodResult = await api(["methods", "someMethod"], {})
`;
