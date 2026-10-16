import { getACRules } from "@src/ConnectionManager/ConnectionManager";
import type { AskLLMArgs } from "./askLLM";
import { HOUR } from "@common/utils";
import type { ValidatedAskLLMChatOptions } from "./getValidatedAskLLMChatOptions";
import { checkLLMLimit } from "./checkLLMLimit";

export const getLlmLimitWasReached = async ({
  dbs,
  user,
  llm_credential,
  llm_prompt_id,
  chat,
}: Pick<
  AskLLMArgs & ValidatedAskLLMChatOptions,
  "dbs" | "user" | "llm_credential" | "llm_prompt_id" | "chat"
>) => {
  const chatId = chat.id;
  const isAdmin = user.type === "admin";
  if (isAdmin) {
    return;
  }
  const accessRules = await getACRules(dbs, user);
  if (!accessRules.length) {
    return;
  }
  const accessControlAllowedLlmCredentials =
    await dbs.access_control_allowed_llm.find({
      access_control_id: { $in: accessRules.map((ac) => ac.id) },
    });
  const permittedLlmCredentials = accessControlAllowedLlmCredentials.filter(
    (c) =>
      c.llm_credential_id === llm_credential.id &&
      c.llm_prompt_id === llm_prompt_id,
  );

  // TODO: fix this mess
  if (permittedLlmCredentials.length) {
    const limitReachedMessage = await checkLLMLimit(
      dbs,
      user,
      permittedLlmCredentials,
      accessRules,
    );
    if (limitReachedMessage) {
      await dbs.llm_chats.update(
        { id: chatId },
        {
          disabled_message: limitReachedMessage,
          disabled_until: new Date(Date.now() + 24 * HOUR),
        },
      );
      return true;
    } else if (chat.disabled_message) {
      await dbs.llm_chats.update(
        { id: chatId },
        {
          disabled_message: null,
          disabled_until: null,
        },
      );
    }
  }
};
