import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";
import { FileTreeNode } from "./FileTreeNode";

// ─── Types ─────────────────────────────────────────────────────────────────────

type GlobResultItem = {
  path: string;
  name: string;
  type: string;
  size: number | undefined;
  lastModified: number | undefined;
  created: number | undefined;
};

type GlobFn = (args: {
  path?: string | undefined;
  timeout?: number | undefined;
}) => Promise<{
  pattern: string;
  path: string;
  result: GlobResultItem[];
}>;

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
  glob: GlobFn | undefined;
  rootPath?: string | undefined;
  onFileSelect?: (node: FileNode) => void;
};

// ─── File Extension → CSS Colour Variable ─────────────────────────────────────

// ─── Glob → sorted FileNode[] (one level) ─────────────────────────────────────

const parseLevel = (items: GlobResultItem[]): FileNode[] =>
  [...items]
    .sort((a, b) => {
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

// ─── Immutable tree update — sets children on the node matching `targetPath` ──

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

// ─── Search filter (only searches already-loaded nodes) ───────────────────────

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

const SearchIcon: FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    className="text-1"
  >
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M9.5 9.5L12.5 12.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const XIcon: FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    className="text-1"
  >
    <path
      d="M2 2l8 8M10 2l-8 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const FileSystemTree: FC<FileSystemTreeProps> = ({
  glob,
  rootPath = "",
  onFileSelect,
}) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rootError, setRootError] = useState<string | null>(null);
  const [rootLoading, setRootLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchLevel = useCallback(
    (path: string): Promise<FileNode[]> => {
      if (!glob) return Promise.reject(new Error("glob not provided"));
      return glob({ path }).then(({ result }) => parseLevel(result));
    },
    [glob],
  );

  // Initial root load
  useEffect(() => {
    setRootLoading(true);
    setRootError(null);
    fetchLevel(rootPath)
      .then((nodes) => {
        setTree(nodes);
      })
      .catch((err: unknown) =>
        setRootError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setRootLoading(false));
  }, [fetchLevel, rootPath]);

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

      fetchLevel(path)
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
        .fst-search:focus { border-color: var(--color-border-primary) !important; outline: none; }
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
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: "var(--font-sans)",
              }}
            >
              Explorer
            </span>
            <span
              style={{
                fontSize: 11,
                color: "currentColor",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 160,
              }}
              title={rootPath}
            >
              {rootPath}
            </span>
          </div>

          <div style={{ position: "relative" }} className="bg-color-1 rounded">
            <span
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <SearchIcon />
            </span>
            <input
              ref={searchRef}
              className="fst-search"
              type="text"
              placeholder="Search files… "
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "5px 28px",
                color: "var(--color-text-primary)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <XIcon />
              </button>
            )}
          </div>
        </div>

        <div
          className="fst-scroll"
          role="tree"
          aria-label="File system"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "4px 0",
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
          {rootError && (
            <div
              style={{
                padding: 16,
                color: "var(--color-text-danger)",
                fontSize: 12,
              }}
            >
              ✗ {rootError}
            </div>
          )}
          {!rootLoading && !rootError && displayTree.length === 0 && (
            <div
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
                node={node}
                depth={0}
                expanded={expanded}
                loading={loading}
                errors={errors}
                selected={selected}
                searchQuery={searchQuery}
                onToggle={handleToggle}
                onSelect={handleSelect}
              />
            ))}
        </div>

        <div
          style={{
            borderTop: "0.5px solid var(--color-border-tertiary)",
            padding: "4px 12px",
            fontSize: 11,
            color: "currentColor",
            display: "flex",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: 8,
            fontFamily: "var(--font-sans)",
          }}
        >
          <span>
            {searchQuery ?
              `${matchCount} match${matchCount !== 1 ? "es" : ""}`
            : `${fileCount} file${fileCount !== 1 ? "s" : ""}`}
          </span>
          {selected && (
            <span
              title={selected}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 220,
              }}
            >
              {selected}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
