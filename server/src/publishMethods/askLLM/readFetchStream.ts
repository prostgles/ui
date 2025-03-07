export const readFetchStream = async (response: Response) => {
  const contentType = response.headers.get("content-type");
  /**
   * Openrouter sends chunked responses
   */
  const isStream = response.headers.get("transfer-encoding") === "chunked";
  if (!isStream && contentType?.includes("application/json")) {
    const result = await response.json();
    return result;
  }
  const reader = response.body?.getReader();
  if (!reader && !isStream) {
    try {
      return await response.json();
    } catch (jsonError) {
      // If direct JSON parsing fails, clone the response (since we already consumed it)
      const responseClone = response.clone();

      // Read as text and try to parse manually
      const text = await responseClone.text();
      try {
        return JSON.parse(text);
      } catch (parseError: any) {
        throw new Error(text);
      }
    }
  }
  if (!reader) throw new Error("No reader");
  const decoder = new TextDecoder();
  let buffer = "";
  let fullBuffer = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const decodedChunk = decoder.decode(value, { stream: true });
      buffer += decodedChunk;
      fullBuffer += decodedChunk;
      // Process complete lines from buffer
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
      // while (true) {
      //   const lineEnd = buffer.indexOf("\n");
      //   if (lineEnd === -1) break;
      //   const line = buffer.slice(0, lineEnd).trim();
      //   buffer = buffer.slice(lineEnd + 1);
      //   if (line.startsWith("data: ")) {
      //     const data = line.slice(6);
      //     if (data === "[DONE]") break;
      //     try {
      //       const parsed = JSON.parse(data);
      //       const content = parsed.choices[0].delta.content;
      //       if (content) {
      //         console.log(content);
      //       }
      //     } catch (e) {
      //       // Ignore invalid JSON
      //     }
      //   }
      // }
    }
  } finally {
    reader.cancel();
  }

  try {
    return JSON.parse(buffer);
  } catch (e) {
    return {};
  }
};
