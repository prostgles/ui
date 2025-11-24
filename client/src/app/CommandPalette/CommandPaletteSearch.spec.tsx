import { getItemSearchRank } from "@components/SearchList/searchMatchUtils/getItemSearchRank";
import { flatUIDocs } from "../UIDocs";

/** We expect every exactly typed title to show first */
flatUIDocs.forEach(({ title: searchTerm }) => {
  let lowestRank = { value: -Infinity, title: "" };
  flatUIDocs.forEach(({ title, description, parentTitles }) => {
    const rank = getItemSearchRank(
      {
        title,
        subTitle: description,
        level: parentTitles.length,
      },
      searchTerm,
    );

    if (rank < lowestRank.value) {
      lowestRank = { value: rank, title };
    }
  });

  if (lowestRank.title !== searchTerm) {
    throw new Error(
      `Search ranking failed for term "${searchTerm}". Expected top result to be "${searchTerm}", but got "${lowestRank.title}" with rank ${lowestRank.value}`,
    );
  }
});
