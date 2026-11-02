import { MANAGED_USER_TYPES, USER_TYPES } from "@common/authTypesAndConstants";
import type { DBSSchema } from "@common/publishUtils";

export const getSignupUserType = (
  configuredType: string | null | undefined,
) => {
  const userType = configuredType ?? USER_TYPES.DEFAULT;
  if (
    userType !== USER_TYPES.DEFAULT &&
    MANAGED_USER_TYPES.some((managedType) => managedType === userType)
  ) {
    throw new Error("Signup requires a default or custom user type");
  }
  // Runtime lookup values can include app types absent from the generated schema.
  return userType as DBSSchema["user_types"]["id"];
};
