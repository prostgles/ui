import { getItemSearchRank } from "@components/SearchList/searchMatchUtils/getItemSearchRank";
import { flatUIDocs } from "../UIDocs";
import { strict } from "assert";
//@ts-ignore
import { test } from "node:test";

void test("Every exactly typed title to be shown first", async () => {
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

    strict.equal(searchTerm, lowestRank.title);
  });
});
