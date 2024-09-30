import { DBSSchema } from "../../../../commonTypes/publishUtils";

type Args = {
  llm_credential: Pick<DBSSchema["llm_credentials"], "key_secret" | "endpoint" | "extraHeaders">; 
  question: string;
  schema: string;
  prompt: string | undefined;
}
export const fetchLLMResponse = async ({ llm_credential, question, schema, prompt }: Args) => {

  const res = await fetch(llm_credential.endpoint || "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${llm_credential.key_secret}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: prompt?.replace("${schema}", schema) || [
            "You are an assistant for a PostgreSQL based software called Prostgles Desktop.",
            "Assist user with any queries they might have.",
            "Below is the database schema they're currently working with:",
            "",
            schema
          ].join("\n")
        },
        { role: "user", content: question }
      ]
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