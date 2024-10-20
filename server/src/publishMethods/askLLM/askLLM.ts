import { DBS } from "../..";
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import * as fs from "fs";
import * as path from "path";
import { justToCompile } from "../../../../commonTypes/DashboardTypes";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
justToCompile;
const dashboardTypes = fs.readFileSync(path.join(__dirname, "../../../../commonTypes/DashboardTypes.d.ts"), "utf8");

export const askLLM = async (question: string, schema: string, chatId: number, dbs: DBS, user: DBSSchema["users"]) => {
  if(typeof question !== "string") throw "Question must be a string";
  if(typeof schema !== "string") throw "Schema must be a string";
  if(!question.trim()) throw "Question is empty";
  if(!Number.isInteger(chatId)) throw "chatId must be an integer";
  const chat = await dbs.llm_chats.findOne({ id: chatId, user_id: user.id });
  if(!chat) throw "Chat not found";
  const llm_credential = await dbs.llm_credentials.findOne({ id: chat.llm_credential_id });
  if(!llm_credential) throw "LLM credentials missing";

  const pastMessages = await dbs.llm_messages.find({ chat_id: chatId });

  await dbs.llm_messages.insert({
    user_id: user.id,
    chat_id: chatId,
    message: question,
  });

  /** Update chat name based on first user message */
  const isFirstUserMessage = !pastMessages.some(m => m.user_id === user?.id);
  if(isFirstUserMessage){
    dbs.llm_chats.update({ id: chatId }, { name: question.slice(0, 25) + "..." });
  }

  const aiResponseMessage = await dbs.llm_messages.insert({
    user_id: null as any,
    chat_id: chatId,
    message: "",
  }, { returning: "*" });
  try {
    const promptObj = await dbs.llm_prompts.findOne({ id: chat.llm_prompt_id });
    if(!promptObj) throw "Prompt not found";
    const { prompt } = promptObj;
    if(!prompt) throw "Prompt is empty";

    const promptWithContext = prompt
      .replace("${schema}", schema)
      .replace("${dashboardTypes}", dashboardTypes);

    const { aiText } = await fetchLLMResponse({ 
      llm_credential, 
      messages: [
        { role: "system", content: promptWithContext },
        ...pastMessages.map(m => ({ 
          role: m.user_id? "user" : "system", 
          content: m.message ?? ""
        } satisfies LLMMessage)),
        { role: "user", content: question } satisfies LLMMessage
      ]
    });
    let aiMessage = aiText;
    if(typeof aiText !== "string") {
      aiMessage = "Error: Unexpected response from LLM";
    }
    await dbs.llm_messages.update({ id: aiResponseMessage.id }, { message: aiMessage });

  } catch(err){
    console.error(err);
    const isAdmin = user?.type === "admin";
    const errorText = isAdmin? `<br></br><pre>${JSON.stringify(getErrorAsObject(err), null, 2)}</pre>` : ""
    await dbs.llm_messages.update({ id: aiResponseMessage.id }, { 
      message: `<span style="color:red;">Something went wrong</span>${errorText}`
    });
  }
};
type LLMMessage = { role: "system" | "user", content: string }

type Args = {
  llm_credential: Pick<DBSSchema["llm_credentials"], "key_secret" | "endpoint" | "extra_headers" | "body_parameters">;
  messages: LLMMessage[];
}
export const fetchLLMResponse = async ({ llm_credential, messages }: Args) => {

  const res = await fetch(llm_credential.endpoint || "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${llm_credential.key_secret}`,
      ...llm_credential.extra_headers
    },
    body: JSON.stringify({
      model: "gpt-4o",
      ...llm_credential.body_parameters,
      messages,
    })
  });

  if(!res.ok){
    let errorText = await (res.text().catch(() => ""));
    throw new Error(`Failed to fetch LLM response: ${res.statusText} ${errorText}`);
  }
  const response: any = await res.json();
  const aiText = response?.choices[0]?.message.content;

  return {
    aiText
  }
};