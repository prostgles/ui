import type { W_SQLState } from "./W_SQL";

export const parseExplainResult = ({
  rows = [],
  cols = [],
  activeQuery,
}: Pick<W_SQLState, "rows" | "cols" | "activeQuery">): Pick<
  W_SQLState,
  "rows" | "cols"
> => {
  const isTextPlan = rows.some(
    ([line]) => typeof line === "string" && line.includes("(cost="),
  );
  if (
    activeQuery?.state === "ended" &&
    activeQuery.info?.command === "EXPLAIN" &&
    isTextPlan
  ) {
    const rowsWithInfo: {
      actionInfo: string;
      startupCost: number;
      totalCost: number;
      rows: number;
      width: number;
      plan: string;
    }[] = [];
    (rows as [string][]).forEach(([line]) => {
      const actionInfo =
        (line.trim().startsWith("->") ?
          line.split("->")[1]?.split("(")[0]?.trim()
        : line.split("(cost=")[0]?.trim()) ?? "";
      const startupCost = Number(
        line.split("(cost=")[1]?.split("..")[0] ??
          rowsWithInfo.at(-1)?.startupCost ??
          0,
      );
      const totalCost = Number(
        line.split("(cost=")[1]?.split("..")[1]?.split(" ")[0] ?? startupCost,
      );
      const rowsNum = Number(
        line.split("rows=")[1]?.split(" ")[0] ?? startupCost,
      );
      const widthNum = Number(
        line.split("width=")[1]?.split(")")[0] ?? startupCost,
      );

      rowsWithInfo.push({
        actionInfo,
        startupCost,
        totalCost,
        rows: rowsNum,
        width: widthNum,
        plan: line,
      });
    });

    const extraColumns = [
      // "Action",
      "Startup Cost",
      "Total Cost",
      // "Rows",
      // "Width",
    ];
    return {
      rows: rowsWithInfo.map((r) => [
        // r.actionInfo,
        r.startupCost,
        r.totalCost,
        // r.rows,
        // r.width,
        r.plan,
      ]),
      cols: [
        ...extraColumns.map(
          (name, idx) =>
            ({
              idx,
              key: name,
              name: name,
              subLabel: "",
              sortable: false,
              udt_name: name.includes("Cost") ? "numeric" : "text",
              tsDataType: name.includes("Cost") ? "number" : "string",
            }) satisfies Required<W_SQLState>["cols"][number],
        ),
        {
          ...cols[0]!,
          idx: extraColumns.length,
        },
      ],
    };
  }

  return {
    rows,
    cols,
  };
};
