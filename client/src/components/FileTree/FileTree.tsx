import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import React, { useRef } from "react";
import { FileTreeNode } from "./FileTreeNode";
import { FileTreeSearchBar } from "./FileTreeSearchBar";
import { FileTreeSelectedItems } from "./FileTreeSelectedItems";
import { useFileTree, type FileNode } from "./useFileTree";

export type FileTreeProps = {
  rootPath?: string | undefined;
} & (
  | {
      mode: "pick-one";
      type: "all" | "directory" | "file";
      value: string | undefined;
      onChange: (value: string | undefined) => void;
    }
  | {
      mode: "pick-multiple";
      type: "all" | "directory" | "file";
      value: string[] | undefined;
      onChange: (value: string[]) => void;
    }
  | {
      mode: "explorer";
      selectedFilePath: string | undefined;
      onFileSelect: (node: FileNode) => void;
    }
);

export const FileTree = (props: FileTreeProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const state = useFileTree(props);
  const {
    displayTree,
    errors,
    expanded,
    handleToggle,
    loading,
    rootError,
    rootLoading,
    searchQuery,
    tree,
    setRootPath,
    getSortedNodes,
  } = state;

  const itemLimit = 1000;
  return (
    <>
      <style>{`
        .fst-search:focus-within { border-color: var(--active) !important; outline: none; }
        .fst-scroll::-webkit-scrollbar { width: 6px; }
        .fst-scroll::-webkit-scrollbar-thumb { background: var(--b-color); border-radius: 3px; }
      `}</style>

      <FlexCol
        className="bg-color-0 gap-p25 rounded font-16 o-hidden"
        data-command="FileTree"
        style={{
          height: "100%",
          minWidth: 220,
          maxWidth: `min(600px, 98vw)`,
        }}
      >
        <FileTreeSearchBar {...state} />

        <div
          ref={scrollRef}
          role="tree"
          className="fst-scroll f-1 oy-auto ox-hidden"
          aria-label="File system"
        >
          {rootLoading ?
            <Loading sizePx={14} className="m-1" />
          : rootError !== undefined && rootError !== null ?
            <ErrorComponent error={rootError} />
          : displayTree.length === 0 ?
            <div
              className="text-1"
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "currentColor",
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              {searchQuery ?
                `No results for "${searchQuery}"`
              : "Empty directory"}
            </div>
          : <>
              {getSortedNodes(displayTree.slice(0, itemLimit)).map((node) => (
                <FileTreeNode
                  key={node.path}
                  tree={tree}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  loading={loading}
                  errors={errors}
                  searchQuery={searchQuery}
                  onToggle={handleToggle}
                  {...props}
                  onSwitchToFolder={setRootPath}
                  getSortedNodes={getSortedNodes}
                />
              ))}
              {displayTree.length > itemLimit && (
                <i>
                  Displaying first {itemLimit} items. Refine your search to see
                  more.
                </i>
              )}
            </>
          }
        </div>

        <FileTreeSelectedItems {...props} tree={tree} />
      </FlexCol>
    </>
  );
};
