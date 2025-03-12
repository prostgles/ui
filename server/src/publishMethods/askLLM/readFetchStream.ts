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
    // If direct JSON parsing fails, clone the response
    const responseClone = response.clone();

    try {
      return await response.json();
    } catch (jsonError) {
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
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const decodedChunk = decoder.decode(value, { stream: true });
      buffer += decodedChunk;
    }
  } finally {
    reader.cancel();
  }

  return JSON.parse(buffer);
};
