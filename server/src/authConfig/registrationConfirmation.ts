import { createHash } from "node:crypto";

export const createRegistrationConfirmation = (
  code: string,
  lifetime: number,
) => ({
  code_hash: hashRegistrationCode(code),
  confirmed_on: null,
  expires: new Date(Date.now() + lifetime).toISOString(),
});

export const hashRegistrationCode = (code: string) =>
  createHash("sha256").update(code).digest("hex");
