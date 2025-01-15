import { mdiAlert, mdiCodeBraces, mdiLanguageTypescript } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import { InfoRow } from "../../../components/InfoRow";
import PopupMenu from "../../../components/PopupMenu";
import { download } from "../../W_SQL/W_SQL";
import { APICodeExamples } from "./APICodeExamples";
import type { APIDetailsProps } from "./APIDetails";
import { t } from "../../../i18n/i18nUtils";

const AllowedOriginCheck = ({ dbs }: Pick<APIDetailsProps, "dbs">) => {
  const { data: serverSettings } = dbs.global_settings.useSubscribeOne({});
  const [allowed_origin, setAllowedOrigin] = React.useState(
    serverSettings?.allowed_origin,
  );

  if (serverSettings && !serverSettings.allowed_origin) {
    return (
      <PopupMenu
        button={
          <Btn iconPath={mdiAlert} color="warn" variant="faded">
            {t.APIDetailsWs["Allowed origin not set"]}
          </Btn>
        }
        clickCatchStyle={{ opacity: 0.2 }}
        contentStyle={{ maxWidth: "500px" }}
        footerButtons={(pClose) => [
          { label: t.common.Close, onClick: pClose },
          {
            label: t.common.Confirm,
            color: "action",
            variant: "filled",
            disabledInfo:
              !allowed_origin ?
                t.APIDetailsWs["Allowed origin is required"]
              : undefined,
            onClickPromise: async () => {
              await dbs.global_settings.update({}, { allowed_origin });
            },
          },
        ]}
        render={() => (
          <FlexCol>
            <InfoRow className="ws-pre">
              {
                t.APIDetailsWs[
                  "Allowed origin specifies which domains can access this app in a cross-origin manner. Sets the Access-Control-Allow-Origin header. Use '*' or a specific URL to allow API access"
                ]
              }
            </InfoRow>
            <p className="ta-left">
              {
                t.APIDetailsWs[
                  'For testing it is recommended to use "*" as the allowed origin value'
                ]
              }
            </p>
            <FormField
              label={t.APIDetailsWs["Allowed origin"]}
              value={allowed_origin}
              onChange={setAllowedOrigin}
            />
          </FlexCol>
        )}
      />
    );
  }

  return null;
};

export const APIDetailsWs = ({
  dbs,
  dbsMethods,
  connection,
  token,
  projectPath,
}: APIDetailsProps & { token?: string }) => {
  const dbSchemaTypes = usePromise(async () => {
    if (dbsMethods.getAPITSDefinitions && connection.id) {
      const dbSchemaTypes = await dbsMethods.getConnectionDBTypes?.(
        connection.id,
      );
      return dbSchemaTypes;
    }
  }, [dbsMethods, connection.id]);

  return (
    <FlexCol>
      <h4 className="m-0 p-0">
        {t.APIDetailsWs["Websocket API (recommended)"]}
      </h4>
      <div className=" ">
        {t.APIDetailsWs["Realtime Isomorphic API using"]}{" "}
        <a
          target="_blank"
          href="https://github.com/prostgles/prostgles-client-js"
        >
          prostgles-client
        </a>{" "}
        {
          t.APIDetailsWs[
            "library. End-to-end type-safety between client & server using the database Typescript schema provided below:"
          ]
        }
      </div>

      {!!(dbs as any).global_settings && <AllowedOriginCheck dbs={dbs} />}
      <FlexRow className="ai-end mb-1 ">
        <PopupMenu
          title={t.APIDetailsWs.Examples}
          button={
            <Btn variant="filled" iconPath={mdiCodeBraces} color="action">
              {t.APIDetailsWs.Examples}
            </Btn>
          }
          onClickClose={false}
          positioning="center"
          contentStyle={{ width: "700px", maxWidth: "100%" }}
          clickCatchStyle={{ opacity: 0.6 }}
          content={
            <APICodeExamples
              token={token}
              projectPath={projectPath}
              dbSchemaTypes={dbSchemaTypes?.dbSchema}
            />
          }
        />
        <Btn
          title={t.APIDetailsWs["Download typescript schema"]}
          disabledInfo={
            dbsMethods.getConnectionDBTypes ? undefined : (
              t.common["Not permitted"]
            )
          }
          onClick={() => {
            download(
              dbSchemaTypes?.dbSchema,
              "DBoGenerated.d.ts",
              "text/plain",
            );
          }}
          iconPath={mdiLanguageTypescript}
          variant="faded"
          color="action"
        >
          {t.APIDetailsWs["Database schema types"]}
        </Btn>
      </FlexRow>
    </FlexCol>
  );
};
