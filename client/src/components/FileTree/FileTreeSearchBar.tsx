import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import {
  mdiClose,
  mdiMagnify,
  mdiSortAlphabeticalAscending,
  mdiSortClockDescendingOutline,
  mdiSortNumericDescendingVariant,
} from "@mdi/js";
import { isDefined } from "prostgles-types";
import React from "react";
import { FileTreeCurrentDirectory } from "./FileTreeCurrentDirectory";
import { type FileTreeState } from "./useFileTree";
import { Select } from "@components/Select/Select";

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
    <FlexCol className="gap-p5">
      <FileTreeCurrentDirectory
        path={rootPath ?? "/"}
        onChange={(newDir) => setRootPath(newDir)}
        existingFolderNames={tree
          .map((p) => (p.type === "directory" ? p.name : undefined))
          .filter(isDefined)}
      />

      <FlexRow className="f-1 gap-p25">
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
        <Select
          value={sortBy}
          showSelected="icon"
          size="small"
          btnProps={{
            variant: "icon",
          }}
          fullOptions={
            [
              {
                key: "name",
                label: "Alphabetical",
                subLabel: "Sort by name (A-Z)",
                iconPath: mdiSortAlphabeticalAscending,
              },
              {
                key: "lastModified",
                label: "Newest first",
                subLabel: "Sort by modified time (newest first)",
                iconPath: mdiSortClockDescendingOutline,
              },
              {
                key: "size",
                label: "Largest first",
                subLabel: "Sort by size (largest first)",
                iconPath: mdiSortNumericDescendingVariant,
              },
            ] as const
          }
          onChange={setSortBy}
        />
      </FlexRow>
    </FlexCol>
  );
};
