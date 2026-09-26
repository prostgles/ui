/** Ignore layout whitespace and expand ligatures while retaining source offsets. */
export const normalizeAnnotationText = (text: string) => {
  let normalized = "";
  const offsets: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index]!.normalize("NFKC");
    if (!character.trim() || character === "\u00ad") continue;
    normalized += character;
    for (let i = 0; i < character.length; i++) offsets.push(index);
  }
  return { text: normalized, offsets };
};

export const findAnnotationText = (text: string, quote: string) => {
  const source = normalizeAnnotationText(text);
  const target = normalizeAnnotationText(quote).text;
  if (!target) throw new Error("Annotation text must not be empty");
  const start = source.text.indexOf(target);
  if (start < 0) throw new Error("Annotation text was not found");
  if (source.text.indexOf(target, start + 1) !== -1) {
    throw new Error("Annotation text matches more than once; use a longer phrase");
  }
  return {
    start: source.offsets[start]!,
    end: source.offsets[start + target.length - 1]! + 1,
  };
};
