export type SchemaGraphNode = {
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
};

export type SchemaGraphLink = {
  id: string;
  source: SchemaGraphNode;
  target: SchemaGraphNode;
  color: string;
  sourceColIndex: number;
  targetColIndex: number;
  sourceNode: SchemaGraphNode;
  targetNode: SchemaGraphNode;
};
