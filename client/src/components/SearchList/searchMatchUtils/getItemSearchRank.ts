import { isDefined } from "../../../utils/utils";

type SearchItem = { title: string; subTitle: string; level: number };
export const getItemSearchRank = (
  item: SearchItem,
  query: string,
  titleWeight = 2,
  descWeight = 1,
) => {
  const titleScore = getSearchScore(item.title, query, { level: item.level });
  const descScore = getSearchScore(item.subTitle, query, { level: item.level });
  const titleScoreWeighted = titleScore * titleWeight;
  const descScoreWeighted = descScore * descWeight;
  if (titleScore === 0 && descScore === 0) {
    return Infinity;
  }
  if (titleScore === 0) {
    return 100 - descScoreWeighted;
  }
  if (descScore === 0) {
    return 100 - titleScoreWeighted;
  }

  const bestScore = Math.max(titleScoreWeighted, descScoreWeighted);

  // const score = titleScore * titleWeight + descScore * descWeight;
  return 100 - bestScore;
};

const levenshtein = (a: string, b: string) => {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1] ?
          dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[a.length]![b.length]!;
};

const similarity = (a: string, b: string) => {
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return (1 - distance / maxLen) * 100;
};

const getSearchScore = (
  itemValue: string,
  query: string,
  levelOpts?: { level: number; penalty?: number },
) => {
  if (itemValue === query) return 100;
  const itemValueLower = itemValue.toLowerCase();
  const queryLower = query.toLowerCase();

  if (itemValueLower === queryLower) return 99.99;
  const index = itemValueLower.indexOf(queryLower);
  if (index === -1) return 0;

  let score = similarity(itemValueLower, queryLower);

  if (isDefined(levelOpts)) {
    const { level, penalty = 5 } = levelOpts;
    const levelPenalty = (level - 1) * penalty;
    score -= levelPenalty;
  }

  return score;
};
