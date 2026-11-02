export const mergeDefinitions = <T>(
  existing: Record<string, T> | undefined,
  incoming: Record<string, T> | undefined,
  description: string,
): Record<string, T> | undefined => {
  if (!incoming) return existing;
  for (const name of Object.keys(incoming)) {
    if (existing && Object.hasOwn(existing, name)) {
      throw new Error(
        `${description} "${name}" conflicts with a plugin definition`,
      );
    }
  }
  return { ...existing, ...incoming };
};
