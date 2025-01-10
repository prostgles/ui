import type { AnyObject } from "prostgles-types";
import { isTesting } from "..";
import { PROSTGLES_CLOUD_URL } from "../../../commonTypes/utils";

export const prostglesSignup = async (email: string, code: string) => {
  const host = isTesting ? "http://localhost:3004" : PROSTGLES_CLOUD_URL;
  const path = code ? "/magic-link" : "/login";
  const url = `${host}${path}`;
  const rawResp = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      code ? { email, code, returnToken: true } : { username: email },
    ),
  });
  if (!rawResp.ok) {
    const error = await rawResp
      .json()
      .catch(() => rawResp.text())
      .catch(() => rawResp.statusText);
    return { error, hasError: true };
  }
  const { token } = (await rawResp.json()) as AnyObject;
  return { token, host };
};
