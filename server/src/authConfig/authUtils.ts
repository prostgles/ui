import { pbkdf2Sync } from "node:crypto";
import { verify } from "otplib";
import type { User } from "../ConnectionManager/ConnectionManager";

const ITERATIONS = 1e5;
const KEY_LENGTH = 512;
export const getPasswordHash = (
  { id }: Pick<User, "id">,
  rawPassword: string,
): string => {
  const salt = Buffer.from(id).toString("base64");
  const pwdHash = pbkdf2Sync(
    rawPassword,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    "sha512",
  ).toString("hex");
  return pwdHash;
};

export const isTotpTokenValid = async (secret: string, token: string) => {
  try {
    return (await verify({ secret, token })).valid;
  } catch {
    return false;
  }
};
