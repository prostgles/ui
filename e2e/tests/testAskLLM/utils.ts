export const stringify = (obj: any) => JSON.stringify(obj, null, 2);

export type ToolUse = {
  content?: string;
  tool: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
  duration?: number;
  result_content?: string;
};
