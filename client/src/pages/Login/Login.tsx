import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { useAuthState } from "prostgles-client";
import React from "react";
import type { Prgl } from "../../App";
import { AuthenticationNotificationPopup } from "./AuthenticationNotificationPopup";
import { LoginTotpFormFields } from "./LoginTotpForm";
import { LoginWithProviders } from "./LoginWithProviders";

export type LoginFormProps = Pick<Prgl, "auth">;

export const Login = ({ auth }: LoginFormProps) => {
  const authState = useAuthState({ auth });
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

  const {
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    show,
  } = formHandlers ?? {};

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
        <AuthenticationNotificationPopup
          {...authResponse}
          onClose={clearAuthResponse}
        />
      )}
      <FlexCol className="p-2">
        <h2 className="mt-0">{headerTitle}</h2>
        <FormField
          key="username"
          id="username"
          label="Email"
          value={username}
          type="username"
          autoComplete="username"
          style={{
            display: show?.username ? undefined : "none",
          }}
          onChange={(value) => {
            setUsername?.(value);
          }}
        />
        <FormField
          key="password"
          id="password"
          label="Password"
          value={password}
          type="password"
          autoComplete={isOnLogin ? "current-password" : "new-password"}
          style={{
            display: show?.password ? undefined : "none",
          }}
          onChange={(value) => {
            if (!setPassword) return;
            setPassword(value);
          }}
        />
        {show?.confirmPassword && (
          <FormField
            key="new-password"
            id="new-password"
            label="Confirm password"
            value={confirmPassword}
            type="password"
            autoComplete="new-password"
            onChange={setConfirmPassword}
          />
        )}
        {formHandlers && show?.emailVerificationCode && (
          <FormField
            key="email-verification-code"
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
          className="mt-1 jc-center"
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
