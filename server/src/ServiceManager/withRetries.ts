import { tout } from "@src/utils/tout";

export const withRetries = async <T>(
  fn: () => Promise<T>,
  attempts = 3,
  delay = 1000,
): Promise<T> => {
  try {
    const success = await fn();
    return success;
  } catch (error) {
    if (attempts <= 1) {
      throw error;
    }
    console.warn(`Retrying in ${delay}ms...`);
    await tout(delay);
    return withRetries(fn, attempts - 1, delay);
  }
};
