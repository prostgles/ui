export const getMostSimilar = (
  query: string,
  candidates: string[],
): string | undefined => {
  if (candidates.length === 0) return;

  const queryBigrams = getBigrams(query);

  let bestMatch = candidates[0];
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = cosineSimilarity(queryBigrams, getBigrams(candidate));
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch;
};

const getBigrams = (text: string): Map<string, number> => {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const bigrams = new Map<string, number>();

  for (let i = 0; i < normalized.length - 1; i++) {
    const bigram = normalized.slice(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }

  return bigrams;
};

const cosineSimilarity = (
  a: Map<string, number>,
  b: Map<string, number>,
): number => {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const [bigram, countA] of a) {
    dotProduct += countA * (b.get(bigram) ?? 0);
    magnitudeA += countA ** 2;
  }

  for (const [, countB] of b) {
    magnitudeB += countB ** 2;
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};
