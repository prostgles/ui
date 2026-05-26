import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { SUser } from "@src/authConfig/sessionUtils";
import { getACRules } from "@src/ConnectionManager/ConnectionManager";
import type { PublishParams } from "prostgles-server";

export const getLLMAccessParams = async (
  params: PublishParams<DBGeneratedSchema, SUser>,
) => {
  const { user, dbo: dbs } = params;
  if (!user) return;
  const isAdmin = user.type === "admin";
  const accessRules = isAdmin ? undefined : await getACRules(dbs, user);
  const allowedLLMCreds =
    isAdmin ? undefined
    : !accessRules?.length ? undefined
    : await dbs.access_control_allowed_llm.find({
        access_control_id: { $in: accessRules.map((ac) => ac.id) },
      });

  return { ...params, user, accessRules, allowedLLMCreds };
};
