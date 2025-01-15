import React, { useState } from "react";
import { SuccessMessage } from "../../components/Animations";
import Btn from "../../components/Btn";
import Chip from "../../components/Chip";
import ErrorComponent from "../../components/ErrorComponent";
import { ExpandSection } from "../../components/ExpandSection";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import { QRCodeImage } from "../../components/QRCodeImage";
import type { UserData } from "../../dashboard/Dashboard/dashboardUtils";
import type { Prgl } from "../../App";
import { t } from "../../i18n/i18nUtils";

export const Setup2FA = ({
  user,
  dbsMethods,
  onChange,
}: Pick<Prgl, "dbsMethods"> & { user: UserData; onChange: VoidFunction }) => {
  const [OTP, setOTP] = useState<{
    url: string;
    secret: string;
    recoveryCode: string;
  }>();

  const [err, setErr] = useState<any>();
  const [codeConfirm, setCodeConfirm] = useState();
  const [enabled, setEnabled] = useState(false);

  const reset = () => {
    setCodeConfirm(undefined);
    setOTP(undefined);
    setErr(null);
  };

  const enable2FA = async (closePopup: VoidFunction) => {
    try {
      if (!dbsMethods.enable2FA) throw "Something went wrong";
      await dbsMethods.enable2FA(codeConfirm! + "");

      setTimeout(() => {
        onChange();
        closePopup();
        reset();
      }, 1500);
      setEnabled(true);
    } catch (err) {
      setErr(err);
    }
  };
  const imageSize = 250;
  return user.has_2fa_enabled ?
      <Btn
        color="warn"
        variant="faded"
        data-command="Setup2FA.Disable"
        onClickMessage={async (_, setMsg) => {
          await dbsMethods.disable2FA?.();
          setMsg({ ok: "Disabled!" }, onChange);
        }}
      >
        Disable 2FA
      </Btn>
    : <PopupMenu
        title={
          <div className="bold">{t.Setup2FA["Two-factor authentication"]}</div>
        }
        data-command="Setup2FA.Enable"
        button={
          <Btn variant="filled" color="green">
            {t.Setup2FA["Enable 2FA"]}
          </Btn>
        }
        clickCatchStyle={{ opacity: 0.5 }}
        positioning="center"
        initialState={{
          enabled: false,
          canvasNode: null as HTMLCanvasElement | null,
        }}
        onClose={reset}
        contentClassName="p-1"
        footer={
          !OTP ? undefined : (
            (closePopup) => (
              <div
                className="flex-col gap-1 w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") enable2FA(closePopup);
                }}
              >
                <FormField
                  data-command="Setup2FA.Enable.ConfirmCode"
                  value={codeConfirm}
                  type="number"
                  label={t.Setup2FA["Confirm code"]}
                  onChange={(codeConfirm) => {
                    setCodeConfirm(codeConfirm);
                  }}
                  rightContent={
                    <Btn
                      variant="filled"
                      color="action"
                      className="ml-2"
                      data-command="Setup2FA.Enable.Confirm"
                      onClickMessage={() => enable2FA(closePopup)}
                    >
                      {t.Setup2FA["Enable 2FA"]}
                    </Btn>
                  }
                />
              </div>
            )
          )
        }
        render={() =>
          enabled ?
            <SuccessMessage message="2FA Enabled"></SuccessMessage>
          : <div
              className="flex-col gap-1 ai-center"
              style={{ maxWidth: `${imageSize + 100}px` }}
            >
              {!OTP && (
                <div>
                  {
                    t.Setup2FA[
                      "Along with your username and password, you will be asked to verify your identity using the code from authenticator app."
                    ]
                  }
                </div>
              )}

              {!!OTP && (
                <>
                  <div>
                    {t.Setup2FA.Scan}{" "}
                    <a href={OTP.url} target="_blank">
                      {t.Setup2FA[" or tap "]}
                    </a>{" "}
                    {
                      t.Setup2FA[
                        "the image below with the two-factor authentication app on your phone."
                      ]
                    }{" "}
                  </div>
                  <ExpandSection
                    label={t.Setup2FA["I can't scan the QR Code"]}
                    buttonProps={{
                      variant: "outline",
                      "data-command": "Setup2FA.Enable.CantScanQR",
                    }}
                    iconPath=""
                  >
                    <div className="flex-col gap-p5 ai-start jc-start">
                      <div>
                        {
                          t.Setup2FA[
                            "If you can't use a QR code you can enter this information manually:"
                          ]
                        }
                      </div>
                      <div className="flex-col ml-1 pl-2">
                        <Chip
                          variant="naked"
                          label={t.Setup2FA.Name}
                          value={user.username}
                        />
                        <Chip
                          variant="naked"
                          label="Issuer"
                          value={"Prostgles UI"}
                        />
                        <Chip
                          variant="naked"
                          label={t.Setup2FA["Base64 secret"]}
                          value={OTP.secret}
                          data-command="Setup2FA.Enable.Base64Secret"
                        />
                        <Chip
                          variant="naked"
                          label={t.Setup2FA.Type}
                          value={"Time-based OTP"}
                        />
                      </div>
                    </div>
                  </ExpandSection>
                </>
              )}

              <QRCodeImage
                url={OTP?.url}
                size={imageSize}
                variant="href-wrapped"
              />

              {OTP?.recoveryCode && (
                <div
                  className="f-1 flex-col gap-1 p-1"
                  style={{ wordBreak: "break-word" }}
                >
                  <InfoRow variant="naked" className="ai-start">
                    <div className="flex-col gap-1">
                      <div>
                        {
                          t.Setup2FA[
                            "Save the Recovery code below. It will be used in case you lose access to your authenticator app:"
                          ]
                        }
                      </div>
                      <div className="bold" id="totp_recovery_code">
                        {OTP.recoveryCode}
                      </div>
                    </div>
                  </InfoRow>
                </div>
              )}

              {!OTP && (
                <Btn
                  variant="filled"
                  color="action"
                  data-command="Setup2FA.Enable.GenerateQR"
                  onClickPromise={async () => {
                    const setup = await dbsMethods.create2FA?.();
                    if (!setup?.url) {
                      throw "Something went wrong. OTP URL not received";
                    }

                    setOTP(setup);
                  }}
                >
                  {t.Setup2FA["Generate QR Code"]}
                </Btn>
              )}

              {err && <ErrorComponent error={err} findMsg={true} />}
            </div>
        }
      />;
};
