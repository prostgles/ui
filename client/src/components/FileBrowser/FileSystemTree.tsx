import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiClose, mdiMagnify } from "@mdi/js";
import { isDefined } from "prostgles-types";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { FileBrowserCurrentDirectory } from "./FileBrowserCurrentDirectory";
import { FileTreeNode } from "./FileTreeNode";

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  lastModified?: number;
  created?: number;
  children: FileNode[] | null; // null = not yet fetched
};

export type FileSystemTreeProps = {
  rootPath?: string | undefined;
  checkBoxes:
    | undefined
    | {
        type: "all" | "directory" | "file";
        checkedItems: string[] | undefined;
        onCheckedChange: (paths: string[]) => void;
      };

  onFileSelect?: (node: FileNode) => void;
};

export const FileSystemTree = ({
  rootPath: rootPathFromProps,
  onFileSelect,
  checkBoxes,
}: FileSystemTreeProps) => {
  const {
    dbsMethods: { glob },
  } = usePrglCore();

  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [selected, setSelected] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [rootError, setRootError] = useState<string | null>(null);
  const [rootLoading, setRootLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [rootPath, setRootPath] = useState(rootPathFromProps);

  const fetchLevel = useCallback(
    (cwd: string, pattern: string): Promise<FileNode[]> => {
      if (!glob) return Promise.reject(new Error("glob not provided"));
      return glob({ cwd, pattern }).then(({ result, path }) => {
        if (!rootPath && !path) setRootPath(path);
        return parseLevel(result);
      });
    },
    [glob, rootPath],
  );

  const fetchRoot = useCallback(
    (pattern = "") => {
      setRootLoading(true);
      setRootError(null);
      fetchLevel(rootPath ?? "", pattern)
        .then((nodes) => {
          setTree(nodes);
        })
        .catch((err: unknown) =>
          setRootError(err instanceof Error ? err.message : "Failed to load"),
        )
        .finally(() => setRootLoading(false));
    },
    [fetchLevel, rootPath],
  );

  const [isLocalSearch, setIsLocalSearch] = useState(true);
  useEffect(() => {
    if (isLocalSearch) {
      return;
    }

    const handler = setTimeout(() => {
      fetchRoot(
        !searchQuery ? "" : (
          `**/*${searchQuery.trim()}${searchQuery.includes(".") ? "" : "*"}`
        ),
      );
    }, 400);
    return () => clearTimeout(handler);
  }, [fetchRoot, isLocalSearch, searchQuery]);
  useEffect(() => {
    fetchRoot();
  }, [fetchRoot]);

  const handleToggle = useCallback(
    (node: FileNode) => {
      const { path } = node;

      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
          return next;
        }
        next.add(path);
        return next;
      });

      // Only fetch if children haven't been loaded yet
      if (node.children !== null) return;

      setLoading((prev) => new Set(prev).add(path));

      fetchLevel(path, "")
        .then((children) => {
          setTree((prev) => setChildren(prev, path, children));
          setErrors((prev) => {
            const next = new Map(prev);
            next.delete(path);
            return next;
          });
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to load";
          setErrors((prev) => new Map(prev).set(path, msg));
          // Collapse back on error
          setExpanded((prev) => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
        })
        .finally(() => {
          setLoading((prev) => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
        });
    },
    [fetchLevel],
  );

  const handleSelect = useCallback(
    (node: FileNode) => {
      setSelected(node.path);
      onFileSelect?.(node);
    },
    [onFileSelect],
  );

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const displayTree = searchQuery ? filterTree(tree, searchQuery) : tree;
  const fileCount = countFiles(tree);
  const matchCount = searchQuery ? countFiles(displayTree) : fileCount;

  return (
    <>
      <style>{`
        @keyframes fst-spin { to { transform: rotate(360deg); } }
        .fst-search:focus { border-color: var(--active) !important; outline: none; }
        .fst-scroll::-webkit-scrollbar { width: 6px; }
        .fst-scroll::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 3px; }
      `}</style>

      <div
        className="bg-color-0 rounded"
        style={{
          color: "var(--color-text-primary)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-mono)",
          fontSize: 16,
          overflow: "hidden",
          border: "0.5px solid var(--color-border-tertiary)",
          minWidth: 220,
        }}
      >
        <div
          style={{
            padding: "10px 12px 8px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
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
              className="mb-p5"
              onChange={(newDir) => setRootPath(newDir)}
              existingFolderNames={tree
                .map((p) => (p.type === "directory" ? p.name : undefined))
                .filter(isDefined)}
            />
          </div>

          <FlexRow
            style={{ position: "relative" }}
            className="bg-color-1 rounded"
          >
            <Btn
              className="text-1"
              size="small"
              iconPath={mdiMagnify}
              color={isLocalSearch ? undefined : "action"}
              onClick={() => setIsLocalSearch((prev) => !prev)}
              style={{
                position: "absolute",
                left: 6,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              ref={searchRef}
              className="fst-search rounded bg-color-2 b b-color"
              type="text"
              placeholder="Search files… "
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 32px",
                fontSize: 14,
                boxSizing: "border-box",
                transition: "border-color 0.15s",
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
          {rootLoading && (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "currentColor",
                fontSize: 12,
              }}
            >
              Loading…
            </div>
          )}
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
                selected={selected}
                checkBoxes={checkBoxes}
                searchQuery={searchQuery}
                onToggle={handleToggle}
                onSelect={handleSelect}
              />
            ))}
        </div>

        {checkBoxes && (
          <FlexCol className="p-p5 ta-start">
            <div>{checkBoxes.checkedItems?.length} items selected </div>
            <ScrollFade className="o-auto" style={{ maxHeight: 100 }}>
              {checkBoxes.checkedItems?.map((path) => {
                return (
                  <FlexRow key={path}>
                    {path}
                    <Btn
                      variant="faded"
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
          </FlexCol>
        )}
      </div>
    </>
  );
};

const parseLevel = (
  items: Awaited<ReturnType<GeneratedFunctionSchema["glob"]>>["result"],
): FileNode[] =>
  [...items]
    .toSorted((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "directory" ? "directory" : "file",
      size: item.size,
      lastModified: item.lastModified,
      created: item.created,
      children: item.type === "directory" ? null : [], // null = lazy, [] = leaf
    }));

const setChildren = (
  nodes: FileNode[],
  targetPath: string,
  children: FileNode[],
): FileNode[] =>
  nodes.map((node) => {
    if (node.path === targetPath) return { ...node, children };
    if (node.children)
      return {
        ...node,
        children: setChildren(node.children, targetPath, children),
      };
    return node;
  });

const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
  if (!query) return nodes;
  const q = query.toLowerCase();
  const go = (items: FileNode[]): FileNode[] =>
    items.reduce<FileNode[]>((acc, node) => {
      if (node.type === "directory") {
        const ch = go(node.children ?? []);
        if (ch.length || node.name.toLowerCase().includes(q))
          acc.push({ ...node, children: ch });
      } else if (node.name.toLowerCase().includes(q)) {
        acc.push(node);
      }
      return acc;
    }, []);
  return go(nodes);
};

const countFiles = (nodes: FileNode[]): number => {
  let n = 0;
  const go = (items: FileNode[]): void => {
    items.forEach((node) => {
      if (node.type === "file") n++;
      go(node.children ?? []);
    });
  };
  go(nodes);
  return n;
};
