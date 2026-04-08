import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import {
  mdiClose,
  mdiMagnify,
  mdiSortAlphabeticalAscending,
  mdiSortNumericAscending,
  mdiSortNumericDescending,
} from "@mdi/js";
import { isDefined } from "prostgles-types";
import React from "react";
import { FileTreeCurrentDirectory } from "./FileTreeCurrentDirectory";
import { type FileTreeState } from "./useFileTree";

export const FileTreeSearchBar = ({
  rootPath,
  setRootPath,
  tree,
  searchRef,
  isLocalSearch,
  setIsLocalSearch,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
}: FileTreeState) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <FileTreeCurrentDirectory
          path={rootPath ?? "/"}
          onChange={(newDir) => setRootPath(newDir)}
          existingFolderNames={tree
            .map((p) => (p.type === "directory" ? p.name : undefined))
            .filter(isDefined)}
        />
      </div>

      <FlexRow className="f-1 gap-0">
        <FlexRow
          className="fst-search f-1 gap-0 relative rounded bg-color-2 b b-color"
          style={{
            transition: "border-color 0.15s",
          }}
        >
          <Btn
            className="text-1 w-fit"
            size="small"
            iconPath={mdiMagnify}
            color={isLocalSearch ? undefined : "action"}
            onClick={() => setIsLocalSearch((prev) => !prev)}
          />
          <input
            ref={searchRef}
            className="rounded bg-transparent font-14 w-full"
            type="text"
            placeholder="Search files… "
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              outline: "none",
              border: "unset",
              boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <Btn
              type="button"
              iconPath={mdiClose}
              size="small"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
              }}
            />
          )}
        </FlexRow>
        <Btn
          size="micro"
          title={
            sortBy === "name" ? "Sort by name"
            : sortBy === "lastModified" ?
              "Sort by modified time"
            : "Sort by size"
          }
          iconPath={
            sortBy === "name" ? mdiSortAlphabeticalAscending
            : sortBy === "lastModified" ?
              mdiSortNumericDescending
            : mdiSortNumericAscending
          }
          onClick={() => {
            setSortBy((prev) => {
              if (prev === "name") return "lastModified";
              if (prev === "lastModified") return "name";
              return "name";
            });
          }}
        />
      </FlexRow>
    </div>
  );
};
