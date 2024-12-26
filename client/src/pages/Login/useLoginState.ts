import type {
  PasswordLogin,
  PasswordRegister,
} from "prostgles-client/dist/Auth";
import type { AuthResponse } from "prostgles-types";
import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { LoginFormProps } from "./Login";

type PasswordLoginDataAndFunc = {
  onCall: PasswordLogin;
  result: undefined | Awaited<ReturnType<PasswordLogin>>;
} & Parameters<PasswordLogin>[0];

type PasswordRegisterDataAndFunc = {
  onCall: PasswordRegister;
  result: undefined | Awaited<ReturnType<PasswordRegister>>;
} & Parameters<PasswordRegister>[0];

type FormData =
  | ({ type: "login" } & PasswordLoginDataAndFunc)
  | ({ type: "loginTotp" } & PasswordLoginDataAndFunc)
  | ({ type: "loginTotpRecovery" } & PasswordLoginDataAndFunc)
  | ({
      type: "registerWithPassword";
    } & PasswordRegisterDataAndFunc);

type FormStates = FormData["type"];

const loginStates = [
  "login",
  "loginTotp",
  "loginTotpRecovery",
] as const satisfies FormStates[];

export const useLoginState = ({ auth }: LoginFormProps) => {
  const [state, setState] = React.useState<FormStates>("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [totpToken, setTotpToken] = React.useState("");
  const [totpRecoveryCode, setTotpRecoveryCode] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, _setError] = React.useState("");
  const [result, setResult] =
    React.useState<Extract<FormData, { type: typeof state }>["result"]>();

  const [searchParams, setSearchParams] = useSearchParams();
  const emailConfirmedNotification =
    searchParams.get("email-confirmed") === "true";
  const onClearEmailConfirmedNotification =
    !emailConfirmedNotification ? undefined : (
      () => {
        setSearchParams({ "email-confirmed": "" });
      }
    );

  useEffect(() => {
    _setError("");
  }, [username, password, totpToken, totpRecoveryCode, confirmPassword]);

  const formHandlers =
    state === "login" && auth.loginType === "email" ?
      {
        state,
        username,
        setUsername,
        onCall: auth.login,
      }
    : state === "login" && auth.loginType === "email+password" ?
      {
        state,
        username,
        setUsername,
        password,
        setPassword,
        onCall: auth.login,
      }
    : state === "loginTotp" && auth.login ?
      {
        state,
        totpToken,
        setTotpToken,
        onCall: auth.login,
      }
    : state === "loginTotpRecovery" && auth.login ?
      {
        state,
        totpRecoveryCode,
        setTotpRecoveryCode,
        onCall: auth.login,
      }
    : state === "registerWithPassword" && auth.signupWithEmailAndPassword ?
      {
        state,
        username,
        setUsername,
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        onCall: auth.signupWithEmailAndPassword,
        result,
      }
    : undefined;

  const isOnLogin = loginStates.some((v) => v === state);
  const registerTypeAllowed: FormStates = "registerWithPassword";

  const onAuthCall = async () => {
    const formData = {
      username,
      password,
      remember_me: false,
      totp_token: totpToken,
      totp_recovery_code: totpRecoveryCode,
    };

    const errorMap = {
      "no match": "Invalid credentials",
    };
    const setError = (err: string) => {
      _setError(err);
      return Promise.reject(err);
    };
    const setErrorWithInfo = (err: string) => {
      return setError(errorMap[err] ?? err);
    };

    if (!formHandlers?.onCall) {
      return setError("Invalid state");
    }

    if (isOnLogin) {
      if (!username || !password) {
        return setError("Username/password cannot be empty");
      }
      if (formHandlers.state === "loginTotp" && !totpToken) {
        return setError("Token cannot be empty");
      }
      if (formHandlers.state === "loginTotpRecovery" && !totpRecoveryCode) {
        return setError("Recovery code cannot be empty");
      }
    } else {
      if (!username) {
        return setError("Email cannot be empty");
      }
      if (formHandlers.state === "registerWithPassword") {
        if (!password) {
          return setError("Password cannot be empty");
        } else if (password !== confirmPassword) {
          return setError("Passwords do not match");
        }
      }
    }

    const res = await formHandlers.onCall(formData);
    if (!res.success) {
      if (res.code === "totp-token-missing") {
        setState("loginTotp");
      } else {
        const errorMessage = res.message ?? ERR_CODE_MESSAGES[res.code];
        setErrorWithInfo(errorMessage);
      }
    } else {
      if ("redirect_url" in res && res.redirect_url) {
        window.location.href = res.redirect_url;
      }
    }
    setResult(res);
    return res;
  };

  return {
    formHandlers,
    error,
    setState,
    state,
    onAuthCall,
    isOnLogin,
    registerTypeAllowed,
    result,
    onClearEmailConfirmedNotification,
  };
};

const ERR_CODE_MESSAGES = {
  "no-match": "Invalid credentials",
  "password-missing": "Password cannot be empty",
  "totp-token-missing": "Token cannot be empty",
  "invalid-totp-recovery-code": "Invalid recovery code",
  "rate-limit-exceeded": "Too many failed attempts",
  "email-not-confirmed": "Email not confirmed",
  "expired-magic-link": "Magic link expired",
  "inactive-account": "Account is inactive",
  "invalid-password": "Invalid password",
  "invalid-totp-code": "Invalid totp code",
  "invalid-username": "Invalid username",
  "is-from-magic-link": "Cannot login with password",
  "is-from-OAuth": "Cannot login with password",
  "server-error": "Server error",
  "something-went-wrong": "Something went wrong",
  "user-already-registered": "User already registered",
  "username-missing": "Username cannot be empty",
  "weak-password": "Password is too weak",
  "expired-email-confirmation-code": "Email confirmation code expired",
  "invalid-email-confirmation-code": "Invalid email confirmation code",
  "invalid-magic-link": "Invalid magic link",
  "used-magic-link": "Magic link already used",
} satisfies Record<
  | AuthResponse.MagicLinkAuthFailure["code"]
  | AuthResponse.PasswordLoginFailure["code"]
  | AuthResponse.PasswordRegisterFailure["code"],
  string
>;
