import { HOUR } from "prostgles-server/dist/FileManager/FileManager";
import type { DBS } from "../..";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";

export const checkLLMLimit = async (
  dbs: DBS,
  user: DBSSchema["users"],
  allowedUsedLLMCreds: DBSSchema["access_control_allowed_llm"][],
  accessRules: DBSSchema["access_control"][],
) => {
  if (user.type === "admin") return;
  if (!allowedUsedLLMCreds.length) {
    throw "LLM credential/prompt not allowed";
  }
  if (!accessRules.length) throw "Access rules missing for non admin user";
  const usedRules = accessRules.filter((r) =>
    allowedUsedLLMCreds.some((c) => c.access_control_id === r.id),
  );
  const limits = usedRules.map((r) => r.llm_daily_limit);
  if (!limits.length) throw "No limits found";
  if (limits.includes(0)) return;
  const totalLimit = limits.reduce((a, v) => a + v, 0);
  if (totalLimit <= 0) throw "No limit found";

  /** If normal user then check messages by user_id only */
  let userIds: string[] = [];
  if (user.type !== "public") {
    userIds = [user.id];

    /** If public user then must check all messages from the same IP */
  } else {
    const currentSession = await dbs.sessions.findOne({ user_id: user.id });
    if (!currentSession) throw "Session not found";
    const sameIpSessions = await dbs.sessions.find({
      ip_address: currentSession.ip_address,
    });
    userIds = sameIpSessions.map((s) => s.user_id).filter(Boolean);
  }

  if (!userIds.length) throw "User id filter empty";
  const _messagesCount = await dbs.llm_messages.count({
    user_id: { $in: userIds },
    created: { $gte: new Date(Date.now() - 24 * HOUR).toISOString() },
  });
  const messagesCount = +_messagesCount;
  if (+messagesCount > totalLimit) {
    return "Daily limit reached" as const;
  }
};
