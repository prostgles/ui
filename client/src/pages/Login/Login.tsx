import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { AuthNotifPopup } from "./AuthNotifPopup";
import { LoginTotpFormFields } from "./LoginTotpForm";
import { LoginWithProviders } from "./LoginWithProviders";
import { useLoginState } from "./useLoginState";

export type LoginFormProps = Pick<Prgl, "auth">;

export const Login = ({ auth }: LoginFormProps) => {
  const authState = useLoginState({ auth });
  const {
    formHandlers,
    isOnLogin,
    registerTypeAllowed,
    setState,
    error,
    loading,
    authResponse,
    clearAuthResponse,
    onAuthCall,
  } = authState;

  const headerTitle =
    !isOnLogin ? "Sign up"
    : !formHandlers?.setPassword ? "Signup or Login"
    : "Sign in";
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
      {authResponse && (
        <AuthNotifPopup {...authResponse} onClose={clearAuthResponse} />
      )}
      <FlexCol className="p-2">
        <h2 className="mt-0">{headerTitle}</h2>
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
        {formHandlers?.setEmailVerificationCode && (
          <FormField
            id="email-verification-code"
            label="Email verification code"
            value={formHandlers.emailVerificationCode}
            type="text"
            onChange={formHandlers.setEmailVerificationCode}
          />
        )}

        <LoginTotpFormFields {...authState} />

        {error && <ErrorComponent data-command="Login.error" error={error} />}

        <Btn
          loading={loading}
          onClick={onAuthCall}
          variant="filled"
          className="mt-1"
          color="action"
          children={
            isOnLogin ?
              auth.loginType === "email" ?
                "Continue"
              : "Sign in"
            : formHandlers?.state === "registerWithPasswordConfirmationCode" ?
              "Confirm email"
            : "Sign up"
          }
          size="large"
          style={{ width: "100%" }}
        />
        <LoginWithProviders auth={auth} />
      </FlexCol>
      {!formHandlers && <ErrorComponent error="Invalid state" />}
      {auth.signupWithEmailAndPassword && (
        <Btn
          style={{
            fontSize: "14px",
            width: "100%",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }}
          variant="faded"
          data-command="Login.toggle"
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
