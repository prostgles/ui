import React, { createContext, useContext, useState } from "react";
import type { DbsByUserType } from "src/dashboard/Dashboard/DBS";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { useAskLLMToolApprove } from "../Tools/useAskLLMToolApprover";

export type LLMSetupState = ReturnType<typeof useLLMSetupState>;
export type LLMSetupStateReady = Extract<LLMSetupState, { state: "ready" }>;

const useLLMSetupState = () => {
  const { dbs: dbsRaw, user } = usePrglCore();
  const dbs = dbsRaw as DbsByUserType;
  const { data: credentials } = dbs.llm_credentials.useSubscribe();
  const isAdmin = user?.type === "admin";
  const globalSettings = dbs.global_settings?.useSubscribeOne?.();
  const [showChat, setShowChat] = useState<{ selectedChatId?: number }>();

  /** For backward compatibility pick last credential as default */
  const defaultCredential =
    credentials?.find((c) => c.is_default) ?? credentials?.at(-1);

  /** Order by Id to ensure the first prompt is the default chat */
  const { data: prompts } = dbs.llm_prompts.useSubscribe(
    {},
    { orderBy: { id: 1 } },
  );
  const firstPromptId = prompts?.[0]?.id;

  const toolApprovalState = useAskLLMToolApprove();

  if (isAdmin) {
    if (!globalSettings?.data || !credentials || !prompts) {
      return {
        state: "loading" as const,
        prompts,
        showChat,
        setShowChat,
      };
    }

    if (!defaultCredential || !firstPromptId) {
      return {
        state: "mustSetup" as const,
        prompts,
        globalSettings,
        showChat,
        setShowChat,
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
      showChat,
      setShowChat,
    };
  }

  const result = {
    state: "ready" as const,
    toolApprovalState,
    defaultCredential,
    globalSettings,
    credentials,
    prompts,
    firstPromptId,
    showChat,
    setShowChat,
  };

  return result;
};

const LLMSetupContext = createContext<ReturnType<
  typeof useLLMSetupState
> | null>(null);

export const LLMSetupProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const state = useLLMSetupState();
  return (
    <LLMSetupContext.Provider value={state}>
      {children}
    </LLMSetupContext.Provider>
  );
};

export const useLLMSetup = () => {
  const ctx = useContext(LLMSetupContext);
  if (!ctx) throw new Error("useLLMSetup must be used inside LLMSetupProvider");
  return ctx;
};
export const useAskLLMSetupState = () => {
  const ctx = useContext(LLMSetupContext);
  if (!ctx) throw new Error("useLLMSetup must be used inside LLMSetupProvider");
  if (ctx.state !== "ready") {
    throw new Error(`LLM setup is not ready. Current state: ${ctx.state}`);
  }
  return ctx;
};
