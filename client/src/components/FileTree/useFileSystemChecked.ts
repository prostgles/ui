import { useCallback, useMemo } from "react";
import type { FileSystemTreeProps } from "./FileTree";
import { findNode } from "./fileSystemTreeUtils";
import type { FileNode } from "./useFileSystemTree";

type CheckBoxes = FileSystemTreeProps["checkBoxes"];
type CheckBoxMode = NonNullable<CheckBoxes>["type"];

export const useFileSystemChecked = ({
  node,
  tree,
  checkBoxes,
}: {
  node: FileNode;
  tree: FileNode[];
  checkBoxes: CheckBoxes;
}) => {
  const { path } = node;

  const checkedItems = useMemo(() => {
    if (!checkBoxes) return [];
    return compactSelections(checkBoxes.checkedItems ?? []);
  }, [checkBoxes]);

  const inheritedFrom = useMemo(
    () => getNearestCheckedAncestor(checkedItems, path),
    [checkedItems, path],
  );

  const isChecked = useMemo(() => {
    if (checkedItems.includes(path)) return { type: "direct" } as const;
    if (inheritedFrom) return { type: "inherited", inheritedFrom } as const;
    return undefined;
  }, [checkedItems, inheritedFrom, path]);

  const onCheckItem = useCallback(() => {
    if (!checkBoxes) return;

    let nextChecked: string[];

    if (checkBoxes.radioMode) {
      nextChecked = isChecked ? [] : [path];
      checkBoxes.onCheckedChange(nextChecked);
      return;
    }

    if (!isChecked) {
      nextChecked = compactSelections([...checkedItems, path]);
    } else if (isChecked.type === "direct") {
      nextChecked = checkedItems.filter((p) => p !== path);
    } else {
      const inheritedNode = findNode(tree, isChecked.inheritedFrom);
      if (!inheritedNode) return;

      nextChecked = compactSelections([
        ...checkedItems.filter(
          (p) => !isSameOrDescendant(p, isChecked.inheritedFrom),
        ),
        ...collectSelectionWithoutSubtree(inheritedNode, path, checkBoxes.type),
      ]);
    }

    checkBoxes.onCheckedChange(nextChecked);
  }, [checkBoxes, checkedItems, isChecked, path, tree]);

  if (!checkBoxes) return;

  return {
    ...checkBoxes,
    isChecked,
    onCheckItem,
  };
};

const isSelectable = (node: FileNode, mode: CheckBoxMode) =>
  mode === "all" || node.type === mode;

const isSameOrDescendant = (path: string, parentPath: string) =>
  path === parentPath ||
  path.startsWith(parentPath.endsWith("/") ? parentPath : parentPath + "/");

const getNearestCheckedAncestor = (checkedItems: string[], path: string) =>
  checkedItems
    .filter(
      (checkedPath) =>
        checkedPath !== path && isSameOrDescendant(path, checkedPath),
    )
    .toSorted((a, b) => b.length - a.length)[0];

const compactSelections = (paths: string[]) =>
  [...new Set(paths)]
    .toSorted((a, b) => a.length - b.length)
    .filter(
      (candidatePath, index, sortedPaths) =>
        !sortedPaths
          .slice(0, index)
          .some((keptPath) => isSameOrDescendant(candidatePath, keptPath)),
    );

const collectSelectionWithoutSubtree = (
  node: FileNode,
  excludedPath: string,
  mode: CheckBoxMode,
): string[] => {
  if (isSameOrDescendant(node.path, excludedPath)) {
    return [];
  }

  const exclusionIsInsideNode = isSameOrDescendant(excludedPath, node.path);
  if (!exclusionIsInsideNode && isSelectable(node, mode)) {
    return [node.path];
  }

  return (node.children ?? []).flatMap((child) =>
    collectSelectionWithoutSubtree(child, excludedPath, mode),
  );
};
