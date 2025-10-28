import { mdiCodeBraces, mdiLanguageTypescript } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useMemo } from "react";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { t } from "../../../i18n/i18nUtils";
import { download } from "../../W_SQL/W_SQL";
import { APICodeExamples } from "./APICodeExamples";
import type { APIDetailsProps } from "./APIDetails";

export const APIDetailsWs = ({
  dbsMethods,
  connection,
  token,
  projectPath,
}: APIDetailsProps & { token?: string }) => {
  const dbSchemaTypes = usePromise(async () => {
    if (connection.id) {
      const dbSchemaTypes = await dbsMethods.getConnectionDBTypes?.(
        connection.is_state_db ? undefined : connection.id,
      );
      // ?.catch((e) => {
      //   console.error("Failed to get connection DB types", e);
      // });
      return dbSchemaTypes;
    }
  }, [connection.id, connection.is_state_db, dbsMethods]);

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
          rel="noreferrer"
        >
          prostgles-client
        </a>{" "}
        {
          t.APIDetailsWs[
            "library. End-to-end type-safety between client & server using the database Typescript schema provided below:"
          ]
        }
      </div>

      <FlexRow className="ai-end mb-1 ">
        <PopupMenu
          title={t.APIDetailsWs.Examples}
          data-command="APIDetailsWs.Examples"
          button={
            <Btn
              variant="filled"
              iconPath={mdiCodeBraces}
              color="action"
              disabledInfo={
                token ? undefined : "Must generate an access token first"
              }
            >
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
              dbSchemaTypes={dbSchemaTypes}
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
            download(dbSchemaTypes, "DBoGenerated.d.ts", "text/plain");
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
