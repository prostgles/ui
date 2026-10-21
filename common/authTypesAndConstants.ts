export const sidKeyName = "sid_token" as const;

export const USER_TYPES = {
  ADMIN: "admin",
  CONNECTION_ADMIN: "connection_admin",
  PUBLIC: "public",
  DEFAULT: "default",
} as const;

export const MANAGED_USER_TYPES = Object.values(USER_TYPES);

export const canManageBusinessAccess = (type: string | undefined) =>
  type === USER_TYPES.ADMIN || type === USER_TYPES.CONNECTION_ADMIN;
