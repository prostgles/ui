/** Interpolate scalar values; callers render repeated rows before passing them here. */
export const renderEmailText = (
  template: string,
  values: Record<string, unknown>,
  html = false,
  nullText = "",
) => {
  const [first, ...parts] = template.split("{{");
  return (
    first +
    parts
      .map((part) => {
        const end = part.indexOf("}}");
        if (end < 0) throw new Error("Unclosed email template placeholder");
        const value = getTemplateValue(values, part.slice(0, end));
        if (
          value !== null &&
          typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean"
        ) {
          throw new Error("Email template values must be scalar");
        }
        const text = value === null ? nullText : String(value);
        return (
          (html ?
            text
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;")
              .replaceAll("'", "&#39;")
          : text) + part.slice(end + 2)
        );
      })
      .join("")
  );
};

export const getTemplateValue = (values: unknown, path: string): unknown => {
  if (values && typeof values === "object" && Object.hasOwn(values, path)) {
    return (values as Record<string, unknown>)[path];
  }
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key)) {
      throw new Error(`Missing email template value: ${path}`);
    }
    return (value as Record<string, unknown>)[key];
  }, values);
};
