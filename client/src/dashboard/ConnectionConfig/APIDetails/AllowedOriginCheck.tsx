import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import { Label } from "@components/Label";
import PopupMenu from "@components/PopupMenu";
import { mdiAlert } from "@mdi/js";
import React, { useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { t } from "../../../i18n/i18nUtils";

export const AllowedOriginCheck = ({
  databaseConfig,
}: {
  databaseConfig: DBSSchema["database_configs"];
}) => {
  const { dbs } = usePrglCore();
  const firstAllowedOrigin = databaseConfig.cors?.allowedOrigins[0];
  const [allowedOrigin, setAllowedOrigin] = useState(firstAllowedOrigin);

  if (firstAllowedOrigin) {
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
            !allowedOrigin ?
              t.APIDetailsWs["Allowed origin is required"]
            : undefined,
          onClickPromise: async () => {
            await dbs.database_configs.update(
              { id: databaseConfig.id },
              { cors: { allowedOrigins: [allowedOrigin] } },
            );
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
            value={allowedOrigin}
            onChange={setAllowedOrigin}
          />
          <FlexCol>
            <Label label="Suggested values" variant="normal" />
            {[window.location.origin, "*", "null"].map((suggestedValue) => (
              <Btn
                key={suggestedValue}
                variant="faded"
                onClick={() => setAllowedOrigin(suggestedValue)}
              >
                {suggestedValue}
              </Btn>
            ))}
          </FlexCol>
        </FlexCol>
      )}
    />
  );
};
