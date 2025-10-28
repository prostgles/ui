import { mdiPlus } from "@mdi/js";
import React from "react";
import Btn from "@components/Btn";
import { CopyToClipboardBtn } from "@components/CopyToClipboardBtn";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import PopupMenu from "@components/PopupMenu";
import { t } from "../../../i18n/i18nUtils";
import { Sessions } from "../../../pages/Account/Sessions";
import type { APIDetailsProps } from "./APIDetails";

export const APIDetailsTokens = ({
  dbs,
  dbsMethods,
  dbsTables,
  user,
  token,
  setToken,
  tokenCount,
}: APIDetailsProps & {
  token: string;
  tokenCount: number;
  setToken: (value: string) => void;
}) => {
  return (
    <FlexCol data-command="APIDetailsTokens">
      <h4 className="m-0 p-0">
        {t.APIDetailsTokens[`Access tokens (`]({ tokenCount })}
      </h4>
      <div>
        {
          t.APIDetailsTokens[
            "Provide the same level of access as the current account"
          ]
        }
      </div>
      <FlexCol className="w-fit  ">
        <Sessions
          dbs={dbs}
          dbsTables={dbsTables}
          dbsMethods={dbsMethods}
          user={user}
          displayType="api_token"
        />
        <PopupMenu
          title={t.APIDetailsTokens["Create access token"]}
          data-command="APIDetailsTokens.CreateToken"
          button={
            <FlexRow>
              <Btn color="action" variant="filled" iconPath={mdiPlus}>
                {t.APIDetailsTokens["Create token"]}
              </Btn>
            </FlexRow>
          }
          positioning="center"
          initialState={{ days: 100 }}
          clickCatchStyle={{ opacity: 0.5 }}
          render={(pClose, state, setState) => {
            return (
              <FlexCol>
                {!token ?
                  <FormField
                    label={t.APIDetailsTokens["Expires in"]}
                    value={state.days}
                    data-command="APIDetailsTokens.CreateToken.daysUntilExpiration"
                    type="number"
                    inputProps={{
                      step: 1,
                      min: 1,
                      style: {
                        maxWidth: "6ch",
                      },
                    }}
                    onChange={(days) => {
                      setState({ days });
                    }}
                    rightIcons={
                      <FlexRow className="h-full px-1 py-p75">
                        {t.APIDetailsTokens.Days}
                      </FlexRow>
                    }
                    rightContentAlwaysShow={true}
                  />
                : <FlexCol>
                    <div className=" ta-start mt-1">
                      {
                        t.APIDetailsTokens[
                          "These token values will not be shown again"
                        ]
                      }
                    </div>
                    <TokenCopy
                      label={t.APIDetailsTokens["Websocket API"]}
                      token={token}
                    />
                    <TokenCopy
                      label={t.APIDetailsTokens["HTTP API (base64 encoded)"]}
                      token={btoa(token)}
                    />
                  </FlexCol>
                }
                <Btn
                  variant="filled"
                  color="action"
                  className="ml-auto"
                  data-command="APIDetailsTokens.CreateToken.generate"
                  disabledInfo={
                    token ?
                      t.APIDetailsTokens[
                        "Already generated. Close and re-open the popup"
                      ]
                    : undefined
                  }
                  onClickPromise={async () => {
                    const token = await dbsMethods.generateToken!(+state.days)!;
                    setToken(token);
                  }}
                >
                  {t.common.Generate}
                </Btn>
              </FlexCol>
            );
          }}
        />
      </FlexCol>
    </FlexCol>
  );
};

const TokenCopy = ({ token, label }: { token: string; label: string }) => {
  return (
    <div className="flex-col gap-p5 my-1 ta-start">
      <div className="text-1">{label}</div>
      <div
        className="b b-color flex-row ai-center rounded w-fit"
        style={{ maxWidth: "400px" }}
      >
        <div className="p-p5 w-fit w-min-0 text-ellipsis">{token}</div>
        <CopyToClipboardBtn variant="faded" color="action" content={token} />
      </div>
    </div>
  );
};
