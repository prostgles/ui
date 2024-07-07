import type { W_SQLState } from "./W_SQL";

export const parseExplainResult = ({ rows = [], cols = [], activeQuery }: Pick<W_SQLState, "rows" | "cols" | "activeQuery">): Pick<W_SQLState, "rows" | "cols"> => {
  
  if(activeQuery?.state === "ended" && activeQuery.info?.command === "EXPLAIN"){
    const rowsWithInfo: {
      actionInfo: string;
      cost: number;
      rows: number;
      width: number;
      plan: string;
    }[] = [];
    (rows as [string][]).forEach(([line]) => {
      const actionInfo = (
        line.trim().startsWith("->")?
        line.split("->")[1]?.split("(")[0]?.trim() :
        line.split("(cost=")[0]?.trim()
      ) ?? "";
      const cost = Number(line.split("(cost=")[1]?.split(".")[0] ?? rowsWithInfo.at(-1)?.cost ?? 0);
      const rowsNum = Number(line.split("rows=")[1]?.split(" ")[0] ?? rowsWithInfo.at(-1)?.cost ?? "");
      const widthNum = Number(line.split("width=")[1]?.split(")")[0] ?? rowsWithInfo.at(-1)?.cost ?? "");

      rowsWithInfo.push({
        actionInfo,
        cost,
        rows: rowsNum,
        width: widthNum,
        plan: line,
      });
    });
    
    const extraColumns = [
      // "Action", 
      "Cost", 
      // "Rows", 
      // "Width",
    ]
    return {
      rows: rowsWithInfo.map(r => [
        // r.actionInfo, 
        r.cost, 
        // r.rows, 
        // r.width, 
        r.plan
      ]),
      cols: [
        ...extraColumns.map((name, idx) => ({
          idx,
          key: name,
          name: name,
          subLabel: "",
          sortable: false,
          udt_name: "text",
          tsDataType: "string",
        } satisfies Required<W_SQLState>["cols"][number]),),
        {
          ...cols[0]!,
          idx: extraColumns.length,
        }
      ]
    }
  }

  return {
    rows, cols
  }
}