import type { DB } from "prostgles-server/dist/initProstgles";
import { PRGL_PASSWORD, PRGL_USERNAME } from "../envVars";
import type { DBS, Users } from "..";
import { PASSWORDLESS_ADMIN_USERNAME } from "../../../common/OAuthUtils";
import { getPasswordHash } from "../authConfig/authUtils";
import { getElectronConfig } from "../electronConfig";
import { makeSession } from "../authConfig/sessionUtils";
import { YEAR } from "../../../common/utils";

const EMPTY_PASSWORD = "";

const NoInitialAdminPasswordProvided = Boolean(
  !PRGL_USERNAME || !PRGL_PASSWORD,
);
export const activePasswordlessAdminFilter = {
  username: PASSWORDLESS_ADMIN_USERNAME,
  status: "active",
  passwordless_admin: true,
} as const;

export const getPasswordlessAdmin = async (
  db: DBS | Omit<DBS, "tx" | "sql">,
) => {
  if (NoInitialAdminPasswordProvided) {
    return await db.users.findOne(activePasswordlessAdminFilter);
  }
  return undefined;
};

/**
 * If PRGL_USERNAME and PRGL_PASSWORD are specified then create an admin user with these credentials AND allow any IP to connect
 * Otherwise:
 * Create a passwordless admin (PASSWORDLESS_ADMIN_USERNAME, EMPTY_PASSWORD) and allow the first IP to connect
 *  then, the first user to connect must select between these options:
 *    1) Add an account with password (recommended)
 *    2) Continue to allow only the current IP
 *    3) Allow any IP to connect (not recommended)
 *
 */
export const initUsers = async (db: DBS, _db: DB) => {
  let username = PRGL_USERNAME,
    password = PRGL_PASSWORD;
  if (NoInitialAdminPasswordProvided) {
    username = PASSWORDLESS_ADMIN_USERNAME;
    password = EMPTY_PASSWORD;
  }

  /**
   * No initial admin user setup. Create a passwordless admin user is required
   */
  if (!(await db.users.count({ username }))) {
    if (NoInitialAdminPasswordProvided) {
      console.warn(
        `PRGL_USERNAME or PRGL_PASSWORD missing. Creating a passwordless admin user: ${username}`,
      );
    }

    try {
      const initialAdmin = (await db.users.insert(
        {
          username,
          password,
          type: "admin",
          passwordless_admin: Boolean(NoInitialAdminPasswordProvided),
        },
        { returning: "*" },
      )) as Users | undefined;
      if (!initialAdmin) throw "User not inserted";
      await db.users.update(
        {
          id: initialAdmin.id,
        },
        {
          password: password && getPasswordHash(initialAdmin, password),
          status: "active",
        },
      );
    } catch (e) {
      console.error(e);
    }

    const addedUser = await db.users.find({ username });

    console.log(
      "Added admin users: ",
      addedUser.map((u) => u.username),
    );
  }

  const electron = getElectronConfig();
  if (electron?.isElectron) {
    const user = await getPasswordlessAdmin(db);
    if (!user) throw `Unexpected: Electron passwordless_admin misssing`;
    await db.sessions.delete({});
    await makeSession(
      user,
      {
        ip_address: "::1",
        user_agent: "electron",
        type: "web",
        sid: electron.sidConfig.electronSid,
      },
      db,
      Date.now() + 10 * YEAR,
    );
  }
};
