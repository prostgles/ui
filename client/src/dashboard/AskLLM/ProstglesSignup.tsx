import React from "react";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import type { SetupLLMCredentialsProps } from "./SetupLLMCredentials";
import Btn from "../../components/Btn";

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
          <div>
            A code was sent to your email. Enter the code to complete
            registration
          </div>
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
      <Btn
        variant="filled"
        color="action"
        className="mt-1"
        data-command="ProstglesSignup.continue"
        onClickPromise={async () => {
          const { token, error, hasError } = await dbsMethods.prostglesSignup!(
            email,
            otpCode,
          );
          if (hasError) {
            throw error;
          }
          setDidSendCode(true);
          if (!token) return;
          await dbs.global_settings.update(
            {},
            { prostgles_registration: { email, token, enabled: true } },
          );
          await dbs.llm_credentials.insert({
            config: {
              Provider: "Prostgles",
            },
            user_id: undefined as any,
          });
        }}
      >
        Continue
      </Btn>
    </FlexCol>
  );
};
