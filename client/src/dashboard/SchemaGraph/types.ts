export interface Node {
  id: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  width: number;
  height: number;
  hasLinks: boolean;
  header: {
    label: string;
    color: string;
  };
  text: Array<{
    label: string;
    color: string;
  }>;
}

export interface Link {
  id: string;
  source: Node;
  target: Node;
  color: string;
  sourceColIndex: number;
  targetColIndex: number;
  sourceNode: Node;
  targetNode: Node;
} 