/** Coordinates are unscaled page-space pixels, relative to the top-left. */
export type AnnotationRect = { x: number; y: number; width: number; height: number };
export type AnnotationTextSelection = {
  page: number;
  startText: string;
  endText: string;
  rects?: AnnotationRect[];
  /** Docling element bounds constrain matching and provide fallback geometry; may include unselected text. */
  bounds?: AnnotationRect[];
};

export const intersectAnnotationRects = (a: AnnotationRect, b: AnnotationRect): AnnotationRect[] => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? [{ x, y, width, height }] : [];
};

/** Ignore layout whitespace and expand ligatures while retaining source offsets. */
export const normalizeAnnotationText = (text: string, options?: { ignoreHyphens?: boolean }) => {
  let normalized = "";
  const offsets: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index]!.normalize("NFKC");
    if (!character.trim() || character === "\u00ad") continue;
    if (options?.ignoreHyphens && "-‐‑".includes(character)) continue;
    normalized += character;
    for (let i = 0; i < character.length; i++) offsets.push(index);
  }
  return { text: normalized, offsets };
};

export const findAnnotationText = (text: string, quote: string, options?: { ignoreHyphens?: boolean }) => {
  const source = normalizeAnnotationText(text, options);
  const target = normalizeAnnotationText(quote, options).text;
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
