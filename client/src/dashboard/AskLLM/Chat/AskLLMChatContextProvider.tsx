import React, { createContext, useContext } from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { DBS } from "../../Dashboard/DBS";
import { useLLMChatAllowedTools } from "../Tools/useLLMChatAllowedTools";

// type P = ReturnType<typeof useLLMChatAllowedTools>;

// const AskLLMChatContext = createContext<P | undefined>(undefined);

// export const useAskLLMChatContext = () => {
//   const context = useContext(AskLLMChatContext);
//   if (!context) {
//     throw new Error(
//       "useAskLLMChatContext must be used within an AskLLMChatContextProvider",
//     );
//   }
//   return context;
// };

// export const AskLLMChatContextProvider = ({
//   children,
//   activeChat,
//   dbs,
// }: {
//   children: React.ReactNode;
//   activeChat: DBSSchema["llm_chats"];
//   dbs: DBS;
// }) => {
//   const allowedToolsState = useLLMChatAllowedTools({
//     activeChat,
//     dbs,
//   });
//   return (
//     <AskLLMChatContext.Provider value={{ ...allowedToolsState }}>
//       {children}
//     </AskLLMChatContext.Provider>
//   );
// };
