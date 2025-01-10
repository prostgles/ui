import {
  authRequest,
  type PasswordLogin,
  type PasswordRegister,
} from "prostgles-client/dist/Auth";
import type { AuthResponse } from "prostgles-types";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EMAIL_CONFIRMED_SEARCH_PARAM } from "../../../../commonTypes/OAuthUtils";
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
    } & PasswordRegisterDataAndFunc)
  | ({
      type: "registerWithPasswordConfirmationCode";
    } & PasswordRegisterDataAndFunc);

type FormStates = FormData["type"];

const loginStates = [
  "login",
  "loginTotp",
  "loginTotpRecovery",
] as const satisfies FormStates[];

export const useLoginState = ({ auth }: LoginFormProps) => {
  const [loading, setIsLoading] = React.useState(false);
  const [state, setState] = React.useState<FormStates>("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailVerificationCode, setEmailVerificationCode] = React.useState("");
  const [totpToken, setTotpToken] = React.useState("");
  const [totpRecoveryCode, setTotpRecoveryCode] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [usernamesWithPassword, setUsernamesWithPassword] = useState<string[]>(
    [],
  );
  const [error, _setError] = React.useState("");
  const [result, setResult] =
    React.useState<Extract<FormData, { type: typeof state }>["result"]>();
  const [authResponse, setAuthResponse] = React.useState<{
    success: boolean;
    message: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const verifiedEmail = searchParams.get(EMAIL_CONFIRMED_SEARCH_PARAM);
  useEffect(() => {
    if (!verifiedEmail) return;
    setAuthResponse({
      success: true,
      message: SIGNUP_CODE_MESSAGES["email-verified"],
    });
  }, [verifiedEmail, setSearchParams]);

  useEffect(() => {
    _setError("");
  }, [username, password, totpToken, totpRecoveryCode, confirmPassword]);

  const formHandlers =
    state === "login" && auth.loginType === "email" ?
      {
        state,
        username,
        setUsername,
        ...(usernamesWithPassword.includes(username) && {
          password,
          setPassword,
        }),
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
    : (
      state === "registerWithPasswordConfirmationCode" &&
      auth.signupWithEmailAndPassword
    ) ?
      {
        state,
        username,
        emailVerificationCode,
        setEmailVerificationCode,
        onCall: () =>
          authRequest(`/magic-link`, {
            email: username,
            code: emailVerificationCode,
          }),
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
    };
    const setErrorWithInfo = (err: string) => {
      return setError(errorMap[err] ?? err);
    };

    if (!formHandlers?.onCall) {
      return setError("Invalid state");
    }

    /**
     * Validate form data
     */
    if (isOnLogin) {
      if (!username) {
        return setError("Username/email cannot be empty");
      }
      if (!password && formHandlers.setPassword) {
        return setError("Password cannot be empty");
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
      if (
        state === "login" &&
        res.code === "password-missing" &&
        !usernamesWithPassword.includes(username)
      ) {
        setUsernamesWithPassword([...usernamesWithPassword, username]);
      }
      if (state === "login" && res.code === "email-not-confirmed") {
        setAuthResponse({
          success: false,
          message: ERR_CODE_MESSAGES[res.code],
        });
        setState("registerWithPasswordConfirmationCode");
      }
      if (res.code === "totp-token-missing") {
        setState("loginTotp");
      } else if (res.code !== "password-missing") {
        const errorMessage = res.message ?? ERR_CODE_MESSAGES[res.code];
        setErrorWithInfo(errorMessage);
      }
    } else {
      if ("redirect_url" in res && res.redirect_url) {
        window.location.href = res.redirect_url;
      }
      if (state === "registerWithPassword" || res.code === "magic-link-sent") {
        setState("registerWithPasswordConfirmationCode");
      }

      let message =
        (res.code && SIGNUP_CODE_MESSAGES[res.code]) ??
        res.message ??
        "Success";
      if (formHandlers.state === "registerWithPasswordConfirmationCode") {
        message = SIGNUP_CODE_MESSAGES["email-verified"];
        setState("login");
      }

      !res.redirect_url &&
        setAuthResponse({
          ...res,
          message,
        });
    }
    setResult(res);
    return res;
  };

  return {
    formHandlers,
    error,
    setState,
    state,
    loading,
    onAuthCall: () => {
      setIsLoading(true);
      return onAuthCall().finally(() => setIsLoading(false));
    },
    isOnLogin,
    registerTypeAllowed,
    result,
    authResponse,
    clearAuthResponse: () => {
      setAuthResponse(undefined);
      setSearchParams({});
    },
  };
};

export const ERR_CODE_MESSAGES = {
  "no-match": "Invalid credentials",
  "password-missing": "Password cannot be empty",
  "totp-token-missing": "Token cannot be empty",
  "invalid-totp-recovery-code": "Invalid recovery code",
  "rate-limit-exceeded": "Too many failed attempts",
  "email-not-confirmed":
    "Email not confirmed. Please check your email and open the confirmation url or enter the provided code",
  "expired-magic-link": "Magic link expired",
  "inactive-account": "Account is inactive",
  "invalid-password": "Invalid or missing password",
  "invalid-totp-code": "Invalid or missing totp code",
  "invalid-username": "Invalid or missing username",
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
  "invalid-email": "Invalid or missing email",
} satisfies Record<
  | AuthResponse.MagicLinkAuthFailure["code"]
  | AuthResponse.PasswordLoginFailure["code"]
  | AuthResponse.PasswordRegisterFailure["code"],
  string
>;

const SIGNUP_CODE_MESSAGES = {
  "already-registered-but-did-not-confirm-email":
    "Email verification re-sent. Open the verification url or enter the code to confirm your email",
  "email-verification-code-sent":
    "Email verification sent. Open the verification url or enter the code to confirm your email",
  "email-verified": "Your email has been confirmed. You can now sign in",
  "magic-link-sent": "Magic link sent. Open the url from your email to login",
} satisfies Record<
  | AuthResponse.PasswordRegisterSuccess["code"]
  | AuthResponse.MagicLinkAuthSuccess["code"]
  | AuthResponse.PasswordRegisterEmailConfirmationSuccess["code"],
  string
>;
