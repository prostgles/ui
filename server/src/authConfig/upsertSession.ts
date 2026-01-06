import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { DAY } from "@common/utils";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { Users } from "..";
import { getActiveSession } from "./getActiveSession";
import { makeSession, parseAsBasicSession } from "./sessionUtils";

type CreateSessionArgs = {
  user: Users;
  ip: string;
  db: DBOFullyTyped<DBGeneratedSchema>;
  user_agent: string | undefined;
};
export const upsertSession = async ({
  db,
  ip,
  user,
  user_agent,
}: CreateSessionArgs) => {
  const {
    validSession: activeSession,
    failedTooManyTimes,
    error,
  } = await getActiveSession(db, {
    type: "login-success",
    filter: { user_id: user.id, type: "web", user_agent: user_agent ?? "" },
  });
  if (error) {
    throw error;
  }
  if (failedTooManyTimes) {
    throw "rate-limit-exceeded";
  }
  if (!activeSession) {
    const globalSettings = await db.global_settings.findOne();
    const expires =
      Date.now() + (globalSettings?.session_max_age_days ?? 1) * DAY;
    return await makeSession(
      user,
      { ip_address: ip, user_agent: user_agent || null, type: "web" },
      db,
      expires,
    );
  }
  await db.sessions.update({ id: activeSession.id }, { last_used: new Date() });
  return parseAsBasicSession(activeSession);
};
