export const logTimedStep = (description: string) => {
  const startedAt = performance.now();
  console.log(`[Prostgles] ${description}...`);
  return () => {
    const durationSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);
    console.log(`[Prostgles] ${description} completed in ${durationSeconds}s`);
  };
};
