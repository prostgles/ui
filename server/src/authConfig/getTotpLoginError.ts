import type { AuthResponse } from "prostgles-types";
import type { DBS, Users } from "..";
import { getPasswordHash, isTotpTokenValid } from "./authUtils";

export const getTotpLoginError = async (
  user: Users,
  token: string | undefined,
  recoveryCode: string | undefined,
  dbs: Pick<DBS, "users">,
): Promise<AuthResponse.PasswordLoginFailure["code"] | undefined> => {
  if (!user["2fa"]?.enabled) return;
  if (recoveryCode) {
    const hashedRecoveryCode = getPasswordHash(user, recoveryCode.trim());
    const matchingUser = await dbs.users.findOne(
      {
        id: user.id,
        "2fa": { "@>": { recoveryCode: hashedRecoveryCode } },
      },
      { select: { id: 1 } },
    );
    return matchingUser ? undefined : "invalid-totp-recovery-code";
  }
  if (!token) return "totp-token-missing";
  if (!(await isTotpTokenValid(user["2fa"].secret, token))) {
    return "invalid-totp-code";
  }
};
