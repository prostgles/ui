import { DBS } from "../..";
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import * as fs from "fs";
import * as path from "path";
import { justToCompile } from "../../../../commonTypes/DashboardTypes";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { AnyObject, pickKeys } from "prostgles-types";
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
          role: m.user_id? "user" : "assistant", 
          content: m.message ?? ""
        } satisfies LLMMessage)),
        { role: "user", content: question } satisfies LLMMessage
      ]
    });
    const aiMessage = typeof aiText !== "string"? "Error: Unexpected response from LLM" : aiText;
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
type LLMMessage = { role: "system" | "user" | "assistant", content: string }

type Args = {
  llm_credential: Pick<DBSSchema["llm_credentials"], "config" | "endpoint" | "result_path">;
  messages: LLMMessage[];
}
export const fetchLLMResponse = async ({ llm_credential, messages: _messages }: Args) => {

  const systemMessage = _messages.filter(m => m.role === "system");
  const [systemMessageObj, ...otherSM] = systemMessage;
  if(!systemMessageObj) throw "Prompt not found";
  if(otherSM.length) throw "Multiple prompts found";
  const { config } = llm_credential;
  const messages = config?.Provider === "OpenAI"? _messages : _messages.filter(m => m.role !== "system");
  const headers = config?.Provider === "OpenAI"? {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.API_Key}`,
  } : config?.Provider === "Anthropic"?  {
    "content-type": "application/json",
    "x-api-key": config.API_Key,
    "anthropic-version": config["anthropic-version"],
  } : config?.headers;

  const body = config?.Provider === "OpenAI"?  {
    ...pickKeys(config, ["temperature", "max_completion_tokens", "model", "frequency_penalty", "presence_penalty", "response_format"]),
    messages,
  } : config?.Provider === "Anthropic"? {
    ...pickKeys(config, ["model", "max_tokens"]),
    system: systemMessageObj.content,
    messages,
  } : config?.body;
  const res = await fetch(llm_credential.endpoint, {
    method: "POST",
    headers,
    body: body && JSON.stringify(body)
  }).catch(err => Promise.reject(JSON.stringify(getErrorAsObject(err))));

  if(!res.ok){
    let errorText = await (res.text().catch(() => ""));
    throw new Error(`Failed to fetch LLM response: ${res.statusText} ${errorText}`);
  }
  const response: any = await res.json();
  const path = llm_credential.result_path ?? (config?.Provider === "OpenAI"? ["choices", 0, "message", "content"] : ["content", 0, "text"]);
  const aiText = parsePath(response ?? {}, path);
  if(typeof aiText !== "string") throw "Unexpected response from LLM. Expecting string";
  return {
    aiText
  }
};

const parsePath = (obj: AnyObject, path: (string | number)[]) => {
  let val = obj;
  for(const key of path){
    if(val === undefined) return undefined;
    val = val[key];
  }
  return val;
}