import type {
  EmailLoginResponse,
  EmailRegisterResponse,
  MagicLinkAuth,
  PasswordAuth,
  PasswordLoginData,
} from "prostgles-client/dist/Auth";
import React, { useEffect } from "react";
import type { LoginFormProps } from "./Login";
export type AuthResult = EmailLoginResponse | EmailRegisterResponse;

type PasswordLoginDataAndFunc = {
  onCall: PasswordAuth<PasswordLoginData>;
} & PasswordAuth<PasswordLoginData>;

type FormData =
  | ({ type: "login" } & PasswordLoginDataAndFunc)
  | ({ type: "loginWithMagicLink"; onCall: MagicLinkAuth } & Pick<
      PasswordLoginData,
      "username"
    >)
  | ({ type: "loginTotp" } & PasswordLoginDataAndFunc)
  | ({ type: "loginTotpRecovery" } & PasswordLoginDataAndFunc)
  | ({
      type: "registerWithPassword";
      username: string;
      password: string;
      result: undefined | AuthResult;
    } & PasswordLoginDataAndFunc)
  | ({
      type: "registerWithMagicLink";
      username: string;
    } & PasswordLoginDataAndFunc);

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
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<AuthResult>();

  useEffect(() => {
    setError("");
  }, [username, password, totpToken, totpRecoveryCode, confirmPassword]);

  const formHandlers =
    state === "login" && auth.login?.withPassword ?
      {
        state,
        username,
        setUsername,
        password,
        setPassword,
        onCall: auth.login.withPassword,
      }
    : state === "loginTotp" && auth.login?.withPassword ?
      {
        state,
        totpToken,
        setTotpToken,
        onCall: auth.login.withPassword,
      }
    : state === "loginTotpRecovery" && auth.login?.withPassword ?
      {
        state,
        totpRecoveryCode,
        setTotpRecoveryCode,
        onCall: auth.login.withPassword,
      }
    : state === "registerWithPassword" && auth.register?.withPassword ?
      {
        state,
        username,
        setUsername,
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        onCall: auth.register.withPassword,
        result,
      }
    : state === "registerWithMagicLink" && auth.register?.withMagicLink ?
      {
        state,
        username,
        setUsername,
        onCall: auth.register.withMagicLink,
      }
    : undefined;

  const isOnLogin = loginStates.some((v) => v === state);
  const registerTypeAllowed: FormStates =
    auth.register?.withMagicLink ?
      "registerWithMagicLink"
    : "registerWithPassword";

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
    const setErrorWithInfo = (err: string) => {
      setError(errorMap[err] ?? err);
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
      // if (res.error === "Token missing") {
      if (res.code === "totp-token-missing") {
        setState("loginTotp");
      } else {
        setErrorWithInfo(res.message ?? res.code);
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
  };
};
