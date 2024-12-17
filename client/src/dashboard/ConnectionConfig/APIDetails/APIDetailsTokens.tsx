import { mdiContentCopy, mdiPlus } from "@mdi/js";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import PopupMenu from "../../../components/PopupMenu";
import { Sessions } from "../../../pages/Account/Sessions";
import type { APIDetailsProps } from "./APIDetails";
import { t } from "../../../i18n/i18nUtils";

export const APIDetailsTokens = ({
  theme,
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
    <FlexCol>
      <h4 className="m-0 p-0">
        {t.APIDetailsTokens.accessTokenCount({ tokenCount })}
      </h4>
      <div>Provide the same level of access as the current account</div>
      <FlexCol className="w-fit  ">
        <Sessions
          theme={theme}
          dbs={dbs}
          dbsTables={dbsTables}
          dbsMethods={dbsMethods}
          user={user}
          displayType="api_token"
        />
        <PopupMenu
          title="Create access token"
          button={
            <FlexRow>
              <Btn color="action" variant="filled" iconPath={mdiPlus}>
                Create token
              </Btn>
            </FlexRow>
          }
          positioning="center"
          initialState={{ days: 100 }}
          clickCatchStyle={{ opacity: 0.5 }}
          render={(pClose, state, setState) => {
            return (
              <div className="flex-col gap-1">
                {!token ?
                  <FormField
                    label="Expires in"
                    value={state.days}
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
                    rightIcons={<FlexRow className="h-full px-1">Days</FlexRow>}
                    rightContentAlwaysShow={true}
                  />
                : <FlexCol>
                    <div className=" ta-start mt-1">
                      These token values will not be shown again
                    </div>
                    <TokenCopy label="Websocket API" token={token} />
                    <TokenCopy label="HTTP API (base64)" token={btoa(token)} />
                  </FlexCol>
                }
                <Btn
                  variant="filled"
                  color="action"
                  className="ml-auto"
                  disabledInfo={
                    token ?
                      "Already generated. Close and re-open the popup"
                    : undefined
                  }
                  onClickPromise={async () => {
                    const token = await dbsMethods.generateToken!(+state.days)!;
                    setToken(token);
                  }}
                >
                  Generate
                </Btn>
              </div>
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
      <div className="b b-color flex-row ai-center rounded w-fit">
        <div className="p-p5 w-fit ">{token}</div>
        <Btn
          variant="faded"
          color="action"
          iconPath={mdiContentCopy}
          onClickMessage={(e, setM) => {
            navigator.clipboard.writeText(token);
            setM({ ok: "Copied!", duration: 2e3 });
          }}
        />
      </div>
    </div>
  );
};
