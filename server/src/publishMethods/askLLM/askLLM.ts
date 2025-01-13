import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { HOUR } from "prostgles-server/dist/FileManager/FileManager";
import type { AnyObject } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import { type DBS } from "../..";
import { contentOfThisFile as dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { checkLLMLimit } from "./checkLLMLimit";

export const askLLM = async (
  question: string,
  schema: string,
  chatId: number,
  dbs: DBS,
  user: DBSSchema["users"],
  allowedLLMCreds: DBSSchema["access_control_allowed_llm"][] | undefined,
  accessRules: DBSSchema["access_control"][] | undefined,
) => {
  if (typeof question !== "string") throw "Question must be a string";
  if (typeof schema !== "string") throw "Schema must be a string";
  if (!question.trim()) throw "Question is empty";
  if (!Number.isInteger(chatId)) throw "chatId must be an integer";
  const chat = await dbs.llm_chats.findOne({ id: chatId, user_id: user.id });
  if (!chat) throw "Chat not found";
  const { llm_prompt_id, llm_credential_id } = chat;
  if (!llm_prompt_id || !llm_credential_id)
    throw "Chat missing prompt or credential";
  const llm_credential = await dbs.llm_credentials.findOne({
    id: llm_credential_id,
  });
  if (!llm_credential) throw "LLM credentials missing";
  const promptObj = await dbs.llm_prompts.findOne({ id: llm_prompt_id });
  if (!promptObj) throw "Prompt not found";
  const { prompt } = promptObj;
  if (!prompt) throw "Prompt is empty";
  const pastMessages = await dbs.llm_messages.find(
    { chat_id: chatId },
    { orderBy: { created: 1 } },
  );

  await dbs.llm_messages.insert({
    user_id: user.id,
    chat_id: chatId,
    message: question,
  });

  const allowedUsedCreds = allowedLLMCreds?.filter(
    (c) =>
      c.llm_credential_id === llm_credential_id &&
      c.llm_prompt_id === llm_prompt_id,
  );
  if (allowedUsedCreds) {
    const limitReachedMessage = await checkLLMLimit(
      dbs,
      user,
      allowedUsedCreds,
      accessRules!,
    );
    if (limitReachedMessage) {
      await dbs.llm_chats.update(
        { id: chatId },
        {
          disabled_message: limitReachedMessage,
          disabled_until: new Date(Date.now() + 24 * HOUR),
        },
      );
      return;
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

  /** Update chat name based on first user message */
  const isFirstUserMessage = !pastMessages.some((m) => m.user_id === user.id);
  if (isFirstUserMessage) {
    dbs.llm_chats.update(
      { id: chatId },
      { name: question.slice(0, 25) + "..." },
    );
  }

  const aiResponseMessage = await dbs.llm_messages.insert(
    {
      user_id: null as any,
      chat_id: chatId,
      message: "",
    },
    { returning: "*" },
  );
  try {
    const promptWithContext = prompt
      .replace("${schema}", schema)
      .replace("${dashboardTypes}", dashboardTypes);

    const { aiText } = await fetchLLMResponse({
      llm_credential,
      messages: [
        { role: "system", content: promptWithContext },
        ...pastMessages.map(
          (m) =>
            ({
              role: m.user_id ? "user" : "assistant",
              content: m.message,
            }) satisfies LLMMessage,
        ),
        { role: "user", content: question } satisfies LLMMessage,
      ],
    });
    const aiMessage =
      typeof aiText !== "string" ?
        "Error: Unexpected response from LLM"
      : aiText;
    await dbs.llm_messages.update(
      { id: aiResponseMessage.id },
      { message: aiMessage },
    );
  } catch (err) {
    console.error(err);
    const isAdmin = user.type === "admin";
    const errorText =
      isAdmin ?
        `<br></br><pre>${JSON.stringify(getErrorAsObject(err), null, 2)}</pre>`
      : "";
    await dbs.llm_messages.update(
      { id: aiResponseMessage.id },
      {
        message: `<span style="color:red;">Something went wrong</span>${errorText}`,
      },
    );
  }
};
type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

type Args = {
  llm_credential: Pick<
    DBSSchema["llm_credentials"],
    "config" | "endpoint" | "result_path"
  >;
  messages: LLMMessage[];
};

console.error("Must authenticate user for prostgles requests");
export const fetchLLMResponse = async ({
  llm_credential,
  messages: _messages,
}: Args) => {
  const systemMessage = _messages.filter((m) => m.role === "system");
  const [systemMessageObj, ...otherSM] = systemMessage;
  if (!systemMessageObj) throw "Prompt not found";
  if (otherSM.length) throw "Multiple prompts found";
  const { config } = llm_credential;
  const messages =
    config.Provider === "OpenAI" ?
      _messages
    : _messages.filter((m) => m.role !== "system");

  const headers =
    config.Provider === "OpenAI" || config.Provider === "Prostgles" ?
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.API_Key}`,
      }
    : config.Provider === "Anthropic" ?
      {
        "content-type": "application/json",
        "x-api-key": config.API_Key,
        "anthropic-version": config["anthropic-version"],
      }
    : config.headers;

  const body =
    config.Provider === "OpenAI" ?
      {
        ...pickKeys(config, [
          "temperature",
          "max_completion_tokens",
          "model",
          "frequency_penalty",
          "presence_penalty",
          "response_format",
        ]),
        messages,
      }
    : config.Provider === "Anthropic" ?
      {
        ...pickKeys(config, ["model", "max_tokens"]),
        system: systemMessageObj.content,
        messages,
      }
    : config.Provider === "Prostgles" ?
      [
        {
          messages,
        },
      ]
    : config.body;

  if (llm_credential.endpoint === "http://localhost:3004/mocked-llm") {
    return {
      aiText: "Mocked response",
    };
  }

  const res = await fetch(llm_credential.endpoint, {
    method: "POST",
    headers,
    body: body && JSON.stringify(body),
  }).catch((err) => Promise.reject(JSON.stringify(getErrorAsObject(err))));

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch LLM response: ${res.statusText} ${errorText}`,
    );
  }
  const response = (await res.json()) as AnyObject | undefined;
  const path =
    llm_credential.result_path ??
    (config.Provider === "OpenAI" ?
      ["choices", 0, "message", "content"]
    : ["content", 0, "text"]);
  const aiText = parsePath(response ?? {}, path);
  if (typeof aiText !== "string") {
    throw "Unexpected response from LLM. Expecting string";
  }
  return {
    aiText,
  };
};

const parsePath = (obj: AnyObject, path: (string | number)[]) => {
  let val: AnyObject | undefined = obj;
  for (const key of path) {
    if (val === undefined) return undefined;
    val = val[key];
  }
  return val;
};

export const insertDefaultPrompts = async (dbs: DBS) => {
  /** In case of stale schema update */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!dbs.llm_prompts) {
    console.warn("llm_prompts table not found");
    return;
  }

  const prompt = await dbs.llm_prompts.findOne();
  if (prompt) {
    console.warn("Default prompts already exist");
    return;
  }
  const adminUser = await dbs.users.findOne({ passwordless_admin: true });
  const user_id = adminUser?.id;
  await dbs.llm_prompts.insert({
    name: "Chat",
    description: "Basic chat",
    user_id,
    prompt: [
      "You are an assistant for a PostgreSQL based software called Prostgles Desktop.",
      "Assist user with any queries they might have. Do not add empty lines in your sql response.",
      "Reply with a full and concise answer that does not require further clarification or revisions.",
      "Below is the database schema they're currently working with:",
      "",
      "${schema}",
    ].join("\n"),
  });
  await dbs.llm_prompts.insert({
    name: "Dashboards",
    description: "Create dashboards. Claude Sonnet recommended",
    user_id,
    prompt: [
      "You are an assistant for a PostgreSQL based software called Prostgles Desktop.",
      "Assist user with any queries they might have.",
      "Below is the database schema they're currently working with:",
      "",
      "${schema}",
      "",
      "Using dashboard structure below create workspaces with useful views my current schema.",
      "Return only a valid, markdown compatible json of this format: { prostglesWorkspaces: WorkspaceInsertModel[] }",
      "",
      "${dashboardTypes}",
    ].join("\n"),
  });

  const addedPrompts = await dbs.llm_prompts.find();
  console.warn("Added default prompts", addedPrompts);
};
