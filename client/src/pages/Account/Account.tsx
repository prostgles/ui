import { mdiAccount, mdiApplicationBracesOutline, mdiSecurity } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { getKeys } from "prostgles-types";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { API_ENDPOINTS } from "../../../../commonTypes/utils";
import type { ExtraProps } from "../../App";
import { FlexRow } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import Tabs from "../../components/Tabs";
import { PasswordlessSetup } from "../../dashboard/AccessControl/PasswordlessSetup";
import { APIDetails } from "../../dashboard/ConnectionConfig/APIDetails/APIDetails";
import { SmartForm } from "../../dashboard/SmartForm/SmartForm";
import { t } from "../../i18n/i18nUtils";
import { ChangePassword } from "./ChangePassword";
import { Sessions } from "./Sessions";
import { Setup2FA } from "./Setup2FA";

type AccountProps = ExtraProps;

export const Account = (props: AccountProps) => {
  const { dbs, dbsTables, dbsMethods, user, auth } = props;

  const [searchParams, setSearchParams] = useSearchParams();
  const { data: dbsConnection } = dbs.connections.useFindOne({
    is_state_db: true,
  });

  const notAllowedBanner = (
    <InfoRow>
      <h2>Not allowed</h2>
      <p>You are not allowed to access</p>
    </InfoRow>
  );
  if (!user || user.type === "public") {
    return notAllowedBanner;
  }

  if (user.passwordless_admin) {
    return (
      <div
        className=" f-1 flex-col w-full gap-1 p-p5 o-auto"
        style={{ maxWidth: "700px" }}
      >
        <PasswordlessSetup {...props} />
      </div>
    );
  }

  const allowedColumns = [
    "id",
    "username",
    "email",
    "name",
    "type",
    "status",
    "options",
    "created_at",
    "auth_provider",
  ];
  const sectionItems = {
    details: {
      label: t.Account["Account details"],
      leftIconPath: mdiAccount,
      content: (
        <SmartForm
          label=""
          db={dbs as DBHandlerClient}
          methods={dbsMethods}
          tableName="users"
          tables={dbsTables}
          rowFilter={[{ fieldName: "id", value: user.id }]}
          confirmUpdates={true}
          columnFilter={(c) => allowedColumns.includes(c.name)}
          // onChange={console.log}
          disabledActions={["clone", "delete"]}
        />
      ),
    },
    security: {
      label: t.Account.Security,
      leftIconPath: mdiSecurity,
      content: (
        <div className="flex-col gap-1 px-1 f-1">
          <FlexRow>
            <Setup2FA
              user={user}
              dbsMethods={dbsMethods}
              onChange={console.log}
            />
            <ChangePassword dbsMethods={dbsMethods} />
          </FlexRow>

          <Sessions displayType="web_session" {...props} />
        </div>
      ),
    },
    api: {
      label: t.Account.API,
      leftIconPath: mdiApplicationBracesOutline,
      content: (
        <div className="flex-col gap-1 px-1 f-1">
          {dbsConnection ?
            <APIDetails
              {...props}
              projectPath={API_ENDPOINTS.WS_DBS}
              connection={dbsConnection}
            />
          : notAllowedBanner}
        </div>
      ),
    },
  };

  const sectionItemKeys = getKeys(sectionItems);

  return (
    <div className="Account f-1 flex-col w-full o-auto ai-center ">
      <div
        className="flex-col f-1 min-h-0 pt-1 w-full"
        style={{ maxWidth: "800px" }}
      >
        <Tabs
          variant={{
            controlsBreakpoint: 200,
            contentBreakpoint: 500,
            controlsCollapseWidth: 350,
          }}
          className="f-1 shadow"
          activeKey={
            sectionItemKeys.find((s) => s === searchParams.get("section")) ??
            sectionItemKeys[0]
          }
          onChange={(section) => {
            setSearchParams({ section: section as string });
          }}
          items={sectionItems}
          contentClass="f-1 o-autdo flex-row jc-center bg-color-2 "
          onRender={(item) => (
            <div className="flex-col f-1 max-w-800 min-w-0 bg-color-0 shadow w-full">
              <h2 style={{ paddingLeft: "18px" }} className=" max-h-fit">
                {item.label}
              </h2>
              <div
                className={
                  " f-1 o-auto flex-row " + (window.isLowWidthScreen ? "" : " ")
                }
                style={{ alignSelf: "stretch" }}
              >
                {item.content}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};
