export const dedent = (str: string) => {
  const lines = str.replace(/^\n/, "").split("\n");
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim().length > 0)
      .map((line) => line.length - line.trimStart().length),
  );
  return lines.map((line) => line.slice(indent)).join("\n");
};
