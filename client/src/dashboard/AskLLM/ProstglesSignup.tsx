import React from "react";
import { SuccessMessage } from "../../components/Animations";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import type { SetupLLMCredentialsProps } from "./SetupLLMCredentials";
import { isObject } from "../../../../commonTypes/publishUtils";
import { ERR_CODE_MESSAGES } from "../../pages/Login/useLoginState";

export const ProstglesSignup = ({
  setupState,
  dbsMethods,
  dbs,
}: Pick<SetupLLMCredentialsProps, "setupState" | "dbs" | "dbsMethods">) => {
  const [email, setEmail] = React.useState(
    setupState.globalSettings?.data?.prostgles_registration?.email || "",
  );
  const [didSendCode, setDidSendCode] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [error, setError] = React.useState<any>();
  return (
    <FlexCol className="ProstglesSignup">
      <div>
        Provide an email address to get started.
        <br />
        Registering will get you free credits for OpenAI and Anthropic.
      </div>
      <FormField
        id="email"
        type="email"
        label="Email"
        value={email}
        required={true}
        onChange={(email) => {
          setEmail(email);
        }}
      />
      {didSendCode && (
        <>
          <SuccessMessage
            variant="text-sized"
            message="A code was sent to your email. Enter the code to complete registration"
          />
          <FormField
            id="otp-code"
            type="text"
            label="OTP Code"
            value={otpCode}
            required={true}
            onChange={(otpCode) => {
              setOtpCode(otpCode);
            }}
          />
        </>
      )}
      {error && <ErrorComponent error={error} />}
      <Btn
        variant="filled"
        color="action"
        className="mt-1"
        data-command="ProstglesSignup.continue"
        onClick={async () => {
          setError(undefined);
          try {
            const { token, host, error, hasError } =
              await dbsMethods.prostglesSignup!(email, otpCode);
            if (hasError) {
              throw error;
            }
            setDidSendCode(true);
            if (!token) return;
            await dbs.global_settings.update(
              {},
              { prostgles_registration: { email, token, enabled: true } },
            );
            const API_Key = btoa(token);
            await dbs.llm_credentials.insert({
              config: {
                Provider: "Prostgles",
                API_Key,
              },
              endpoint: `${host}/rest-api/cloud/methods/askLLM`,
              user_id: undefined as any,
            });
          } catch (err) {
            if (isObject(err) && "code" in err) {
              setError(ERR_CODE_MESSAGES[err.code] ?? err);
            } else {
              setError(err);
            }
          }
        }}
      >
        Continue
      </Btn>
    </FlexCol>
  );
};
