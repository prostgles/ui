import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { FileSystemTreeProps } from "./FileTree";

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  lastModified?: number;
  created?: number;
  children: FileNode[] | null; // null = not yet fetched
};

export const useFileSystemTree = ({
  rootPath: rootPathFromProps,
  onFileSelect,
  checkBoxes,
  selectedFilePath,
}: FileSystemTreeProps) => {
  const {
    dbsMethods: { glob },
  } = usePrglCore();

  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
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

  return {
    displayTree,
    expanded,
    loading,
    errors,
    selectedFilePath,
    onFileSelect,
    searchQuery,
    setSearchQuery,
    rootError,
    rootLoading,
    fileCount,
    matchCount,
    handleToggle,
    rootPath,
    searchRef,
    tree,
    setRootPath,
    isLocalSearch,
    setIsLocalSearch,
  };
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
