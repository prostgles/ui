import type { FileNode } from "./useFileTree";

export const findNode = (
  nodes: FileNode[],
  targetPath: string,
): FileNode | undefined => {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNode(node.children, targetPath);
      if (found) return found;
    }
  }
  return undefined;
};
