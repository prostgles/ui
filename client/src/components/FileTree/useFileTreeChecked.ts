import { useCallback, useMemo } from "react";
import type { FileTreeProps } from "./FileTree";
import { findNode } from "./fileSystemTreeUtils";
import type { FileNode } from "./useFileTree";
import { isDefined } from "@common/filterUtils";

type CheckBoxMode = "all" | "directory" | "file";

export const useFileTreeChecked = ({
  node,
  tree,
  props,
}: {
  node: FileNode;
  tree: FileNode[];
  props: FileTreeProps;
}) => {
  const { path } = node;
  const checkBoxes = useMemo(() => {
    if (props.mode === "explorer") return undefined;
    return props;
  }, [props]);

  const checkedItems = useMemo(() => {
    if (!checkBoxes) return [];
    return compactSelections(
      checkBoxes.mode === "pick-one" ?
        [checkBoxes.value].filter(isDefined)
      : (checkBoxes.value ?? []),
    );
  }, [checkBoxes]);

  const inheritedFrom = useMemo(
    () => getNearestCheckedAncestor(checkedItems, path),
    [checkedItems, path],
  );

  const isChecked = useMemo(() => {
    if (checkedItems.includes(path)) {
      return { type: "direct" } as const;
    }
    if (inheritedFrom) {
      return { type: "inherited", inheritedFrom } as const;
    }

    const hasCheckedDescendants = checkedItems.filter(
      (checkedPath) =>
        isSameOrDescendant(checkedPath, path) && checkedPath !== path,
    );
    if (hasCheckedDescendants.length) {
      return {
        type: "has-descendants",
        descendants: hasCheckedDescendants,
      } as const;
    }

    return undefined;
  }, [checkedItems, inheritedFrom, path]);

  const onCheckItem = useCallback(() => {
    if (!checkBoxes) return;

    let nextChecked: string[];

    if (checkBoxes.mode === "pick-one") {
      checkBoxes.onChange(path);
      return;
    }

    if (!isChecked) {
      nextChecked = compactSelections([...checkedItems, path]);
    } else if (isChecked.type === "direct") {
      nextChecked = checkedItems.filter((p) => p !== path);
    } else if (isChecked.type === "has-descendants") {
      nextChecked = checkedItems.filter(
        (p) => !isChecked.descendants.includes(p),
      );
    } else {
      const inheritedNode = findNode(tree, isChecked.inheritedFrom);
      if (!inheritedNode) {
        // Might already be inside it (rootPath)
        const inheritedFromValue = checkBoxes.value?.some((p) =>
          isSameOrDescendant(p, isChecked.inheritedFrom),
        );
        if (inheritedFromValue) {
          checkBoxes.onChange([
            ...checkedItems.filter(
              (p) => !isSameOrDescendant(p, isChecked.inheritedFrom),
            ),
            node.path,
          ]);
        }
        return;
      }

      nextChecked = compactSelections([
        ...checkedItems.filter(
          (p) => !isSameOrDescendant(p, isChecked.inheritedFrom),
        ),
        ...collectSelectionWithoutSubtree(inheritedNode, path, checkBoxes.type),
      ]);
    }

    checkBoxes.onChange(nextChecked);
  }, [checkBoxes, checkedItems, isChecked, node.path, path, tree]);

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
