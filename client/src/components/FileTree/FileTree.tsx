import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { Expander } from "@components/Expander";
import { FlexCol, FlexRow } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiClose, mdiMagnify } from "@mdi/js";
import { isDefined } from "prostgles-types";
import React from "react";
import { FileBrowserCurrentDirectory } from "./FileBrowserCurrentDirectory";
import { FileTreeNode } from "./FileTreeNode";
import { useFileSystemTree, type FileNode } from "./useFileSystemTree";
import Loading from "@components/Loader/Loading";
import { findNode } from "./fileSystemTreeUtils";
import { FolderIcon } from "./FolderIcon";
import { FileIcon } from "./FileIcon";

export type FileSystemTreeProps = {
  rootPath?: string | undefined;
  checkBoxes:
    | undefined
    | {
        type: "all" | "directory" | "file";
        radioMode?: boolean;
        checkedItems: string[] | undefined;
        onCheckedChange: (paths: string[]) => void;
      };
  selectedFilePath?: string;
  onFileSelect?: (node: FileNode) => void;
};

export const FileTree = (props: FileSystemTreeProps) => {
  const { checkBoxes } = props;
  const {
    displayTree,
    errors,
    expanded,
    handleToggle,
    loading,
    rootError,
    rootLoading,
    rootPath,
    searchQuery,
    searchRef,
    setRootPath,
    tree,
    isLocalSearch,
    setIsLocalSearch,
    setSearchQuery,
    selectedFilePath,
    onFileSelect,
  } = useFileSystemTree(props);

  return (
    <>
      <style>{`
        @keyframes fst-spin { to { transform: rotate(360deg); } }
        .fst-search:focus-within { border-color: var(--active) !important; outline: none; }
        .fst-scroll::-webkit-scrollbar { width: 6px; }
        .fst-scroll::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 3px; }
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
            <FileBrowserCurrentDirectory
              path={rootPath ?? "/"}
              onChange={(newDir) => setRootPath(newDir)}
              existingFolderNames={tree
                .map((p) => (p.type === "directory" ? p.name : undefined))
                .filter(isDefined)}
            />
          </div>

          <FlexRow
            className="fst-search gap-0 relative rounded bg-color-2 b b-color"
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
        </div>

        <div
          className="fst-scroll"
          role="tree"
          aria-label="File system"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {rootLoading && <Loading />}
          <ErrorComponent error={rootError ?? undefined} />
          {!rootLoading && !rootError && displayTree.length === 0 && (
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
          )}
          {!rootLoading &&
            !rootError &&
            displayTree.map((node) => (
              <FileTreeNode
                key={node.path}
                tree={tree}
                node={node}
                depth={0}
                expanded={expanded}
                loading={loading}
                errors={errors}
                checkBoxes={checkBoxes}
                searchQuery={searchQuery}
                onToggle={handleToggle}
                selectedFilePath={selectedFilePath}
                onFileSelect={onFileSelect}
              />
            ))}
        </div>

        <div className="bt b-color mt-1 w-full mx-p5"></div>
        {checkBoxes && (
          <Expander
            getButton={(isOpen) => (
              <Btn
                className="ml-1"
                iconStyle={{
                  transform: `rotate(${isOpen ? "0deg" : "90deg"})`,
                  transition: "transform 0.2s",
                }}
              >
                {checkBoxes.checkedItems?.length ?? 0} items selected{" "}
              </Btn>
            )}
          >
            <ScrollFade
              className="o-auto p-p5 pl-1 ta-start w-fit "
              style={{ maxHeight: 100 }}
            >
              {checkBoxes.checkedItems?.map((path) => {
                const node = findNode(tree, path);
                return (
                  <FlexRow key={path}>
                    {node?.type === "directory" ?
                      <FolderIcon isOpen={false} />
                    : <FileIcon name={path} />}
                    <div className="f-1">{path}</div>
                    <Btn
                      variant="icon"
                      size="micro"
                      iconPath={mdiClose}
                      onClick={() => {
                        checkBoxes.onCheckedChange(
                          checkBoxes.checkedItems?.filter((p) => p !== path) ??
                            [],
                        );
                      }}
                    />
                  </FlexRow>
                );
              })}
            </ScrollFade>
          </Expander>
        )}
      </FlexCol>
    </>
  );
};
