import { isDefined } from "src/utils/utils";

export const getSearchRanking = (searchTerm: string, labels: string[]) => {
  if (searchTerm) {
    const matchedLabelRank = labels
      .map((l, i) => {
        const idx = l.toLowerCase().indexOf(searchTerm.toLowerCase());
        const rank =
          idx === -1 ? undefined : (
            Number(`${i}.${idx.toString().padStart(3, "0")}`)
          );
        return rank;
      })
      .filter(isDefined)[0];
    return matchedLabelRank ?? Infinity;
  }
  return Infinity;
};
