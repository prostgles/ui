import { useMemo } from "react";
import type { Prgl } from "../../../App";
import type { DbsByUserType } from "../../Dashboard/DBS";

export type LLMSetupState = ReturnType<typeof useLLMSetupState>;
export type LLMSetupStateReady = Extract<LLMSetupState, { state: "ready" }>;

export const useLLMSetupState = (props: Pick<Prgl, "dbs" | "user">) => {
  const dbs = props.dbs as DbsByUserType;
  const { user } = props;
  const { data: credentials } = dbs.llm_credentials.useSubscribe();
  const isAdmin = user?.type === "admin";
  const globalSettings = dbs.global_settings?.useSubscribeOne?.();

  const mcpServers = dbs.mcp_servers.useFind(
    {},
    { select: { name: 1, icon_path: 1 } },
  );
  const mcpServerIcons = useMemo(() => {
    const iconMap = new Map<string, string>();
    mcpServers.data?.forEach((s) => {
      if (s.icon_path) {
        iconMap.set(s.name, s.icon_path);
      }
    });
    return iconMap;
  }, [mcpServers]);

  /** For backward compatibility pick last credential as default */
  const defaultCredential =
    credentials?.find((c) => c.is_default) ?? credentials?.at(-1);

  /** Order by Id to ensure the first prompt is the default chat */
  const { data: prompts } = dbs.llm_prompts.useSubscribe(
    {},
    { orderBy: { id: 1 } },
  );
  const firstPromptId = prompts?.[0]?.id;

  if (isAdmin) {
    if (!globalSettings?.data) {
      return {
        state: "loading" as const,
        prompts,
      };
    }

    if (!defaultCredential || !credentials || !prompts || !firstPromptId) {
      return {
        state: "mustSetup" as const,
        prompts,
        globalSettings,
      };
    }

    const {
      data: { prostgles_registration },
    } = globalSettings;
    if (prostgles_registration) {
      const { enabled, email, token } = prostgles_registration;
      // const quota = await POST("/api/llm/quota", { token });
      console.error("Finish this");
    }
  } else if (!defaultCredential || !credentials || !prompts || !firstPromptId) {
    return {
      state: "cannotSetupOrNotAllowed" as const,
      prompts,
    };
  }

  const result = {
    state: "ready" as const,
    defaultCredential,
    globalSettings,
    credentials,
    prompts,
    firstPromptId,
    mcpServerIcons,
  };

  return result;
};
