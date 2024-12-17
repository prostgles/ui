import React from "react";
import type { useLoginState } from "./useLoginState";
import FormField from "../../components/FormField/FormField";
import Btn from "../../components/Btn";

export const LoginTotpFormFields = ({
  formHandlers,
  onAuthCall,
  setState,
}: ReturnType<typeof useLoginState>) => {
  if (
    !formHandlers ||
    (formHandlers.state !== "loginTotp" &&
      formHandlers.state !== "loginTotpRecovery")
  )
    return null;

  return formHandlers.state === "loginTotp" ?
      <>
        <p>Open your authentication app and enter the code for Prostgles UI</p>
        <FormField
          id="totp_token"
          value={formHandlers.totpToken}
          inputProps={{
            id: "totp_token",
          }}
          type="number"
          label="6-digit code"
          // error={error}
          onChange={(v) => {
            formHandlers.setTotpToken(v);
            if (formHandlers.totpToken.length > 5) {
              onAuthCall();
            }
          }}
        />
        <div className="flex-row ai-center mt-p25">
          <div className="text-1p5">Or</div>
          <Btn
            type="button"
            color="action"
            size="small"
            onClick={() => setState("loginTotpRecovery")}
          >
            Enter recovery code
          </Btn>
        </div>
      </>
    : <>
        <p>Open your authentication app and enter the code for Prostgles UI</p>
        <FormField
          id="totp_recovery_code"
          inputProps={{
            id: "totp_recovery_code",
          }}
          value={formHandlers.totpRecoveryCode}
          type="text"
          label="2FA Recovery code"
          // error={error}
          onChange={(v) => formHandlers.setTotpRecoveryCode(v)}
        />
        <Btn
          type="button"
          color="action"
          size="small"
          onClick={() => setState("loginTotp")}
        >
          Cancel
        </Btn>
      </>;
};
