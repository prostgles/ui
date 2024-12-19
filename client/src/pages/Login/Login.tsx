import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import FormField from "../../components/FormField/FormField";
import { useLoginState } from "./useLoginState";
import { LoginWithProviders } from "./LoginWithProviders";
import { LoginTotpFormFields } from "./LoginTotpForm";
import { FlexCol } from "../../components/Flex";
import Popup from "../../components/Popup/Popup";

export type LoginFormProps = Pick<Prgl, "auth">;

export const Login = ({ auth }: LoginFormProps) => {
  const authState = useLoginState({ auth });
  const [successMessage, setSuccessMessage] = React.useState("");
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const {
    formHandlers,
    isOnLogin,
    registerTypeAllowed,
    setState,
    error,
    onAuthCall: _onAuthCall,
    result,
  } = authState;
  const onAuthCall = async () => {
    setIsLoggingIn(true);
    _onAuthCall()
      .then((res) => {
        if (result?.success) {
          const message =
            result.message ||
            (result.code ?
              {
                "must-confirm-email": "Please confirm your email",
                "email-confirmation-sent": "Email confirmation sent",
                "already-registered-but-did-not-confirm-email":
                  "Please confirm your email",
              }[result.code]
            : "Success");
          setSuccessMessage(message);
        }
      })
      .finally(() => {
        setIsLoggingIn(false);
      });
  };

  return (
    <form
      className="LoginForm flex-col gap-1 rounded shadow m-auto w-fit bg-color-0"
      style={{
        maxWidth: "400px",
        minWidth: "380px",
      }}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {successMessage && (
        <Popup onClose={() => setSuccessMessage("")}>{successMessage}</Popup>
      )}
      <FlexCol className="p-2 pb-1">
        <h2 className="mt-0">{!isOnLogin ? "Sign up" : "Sign in"}</h2>
        {formHandlers?.setUsername && (
          <FormField
            id="username"
            label="Email"
            value={formHandlers.username}
            type="username"
            onChange={formHandlers.setUsername}
          />
        )}
        {formHandlers?.setPassword && (
          <FormField
            id="password"
            label="Password"
            value={formHandlers.password}
            type="password"
            onChange={formHandlers.setPassword}
          />
        )}
        {formHandlers?.setConfirmPassword && (
          <FormField
            id="new-password"
            label="Confirm password"
            value={formHandlers.confirmPassword}
            type="password"
            autoComplete="new-password"
            onChange={formHandlers.setConfirmPassword}
          />
        )}

        <LoginTotpFormFields {...authState} />

        {error && <ErrorComponent data-command="Login.error" error={error} />}

        <Btn
          loading={isLoggingIn}
          onClick={onAuthCall}
          variant="filled"
          className="mt-1"
          color="action"
          children={isOnLogin ? "Sign in" : "Sign up"}
          size="large"
          style={{ width: "100%" }}
        />
        <LoginWithProviders auth={auth} />
      </FlexCol>
      {!formHandlers && <ErrorComponent error="Invalid state" />}
      {auth.register && (
        <Btn
          style={{
            fontSize: "14px",
            width: "100%",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }}
          variant="faded"
          color="action"
          onClick={() => {
            setState(isOnLogin ? registerTypeAllowed : "login");
          }}
        >
          {isOnLogin ?
            "No account? Sign up with email"
          : "Already have an account? Sign in"}
        </Btn>
      )}
    </form>
  );
};
