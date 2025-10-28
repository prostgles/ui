import React from "react";
import type { APIDetailsProps } from "./APIDetails";
import PopupMenu from "@components/PopupMenu";
import { mdiAlert } from "@mdi/js";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { t } from "../../../i18n/i18nUtils";
import FormField from "@components/FormField/FormField";

export const AllowedOriginCheck = ({ dbs }: Pick<APIDetailsProps, "dbs">) => {
  const { data: serverSettings } = dbs.global_settings.useSubscribeOne({});
  const [allowed_origin, setAllowedOrigin] = React.useState(
    serverSettings?.allowed_origin,
  );

  if (serverSettings?.allowed_origin) {
    return null;
  }

  return (
    <PopupMenu
      data-command="AllowedOriginCheck"
      button={
        <Btn iconPath={mdiAlert} color="warn" variant="faded">
          {t.APIDetailsWs["Allowed origin not set"]}
        </Btn>
      }
      clickCatchStyle={{ opacity: 1 }}
      contentStyle={{ maxWidth: "500px" }}
      footerButtons={(pClose) => [
        { label: t.common.Close, onClick: pClose },
        {
          label: t.common.Confirm,
          color: "action",
          variant: "filled",
          className: "ml-auto",
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
            Allowed origin controls which domains can make cross-origin requests
            to this app by setting the Access-Control-Allow-Origin header.
            <ul>
              <li>
                Use 'null' to allow requests from local HTML files (file://
                protocol)
              </li>
              <li>
                Use '*' to allow all domains (recommended for testing only)
              </li>
              <li>
                Use specific URLs (e.g., 'https://your-website.com') for
                production environments
              </li>
            </ul>
            <p>
              ⚠️ Security Note: Using '*' in production can expose your API to
              unauthorized access from any
            </p>
          </InfoRow>

          <FormField
            label={t.APIDetailsWs["Allowed origin"]}
            data-command="AllowedOriginCheck.FormField"
            value={allowed_origin}
            onChange={setAllowedOrigin}
          />
        </FlexCol>
      )}
    />
  );
};
